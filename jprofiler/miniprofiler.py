import json
import psutil
import platform
from IPython.core.getipython import get_ipython
from IPython.core.interactiveshell import ExecutionInfo, ExecutionResult, InteractiveShell
from IPython.display import JSON, display
from pyinstrument import Profiler
from pyinstrument.renderers.jsonrenderer import JSONRenderer

class MiniProf:
    def __init__(self, ip: InteractiveShell):
        self.ip = ip
        self.memory_usage = {}
        self.profiler = Profiler(async_mode="enabled", interval=0.0001)
        self.platform_info = self.get_platform_info()

    def get_platform_info(self):
        return {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "python_version": platform.python_version(),
            "cpu_count": psutil.cpu_count(logical=False),
            "cpu_count_logical": psutil.cpu_count(logical=True)
        }

    def register(self, ip: InteractiveShell):
        ip.events.register("pre_run_cell", self.pre_run_hook)
        ip.events.register("post_run_cell", self.post_run_hook)

    def pre_run_hook(self, info: ExecutionInfo):
        cell_id = info.cell_id
        self.memory_usage[cell_id] = psutil.Process().memory_info().rss
        self.profiler.start()

    def post_run_hook(self, result: ExecutionResult):
        if result.info is None or result.info.cell_id not in self.memory_usage:
            return

        cell_id = result.info.cell_id
        self.profiler.stop()

        profile = self.profiler.output(renderer=JSONRenderer(show_all=True))
        profile = json.loads(profile)

        end_memory = psutil.Process().memory_info().rss
        start_memory = self.memory_usage.pop(cell_id, 0)
        memory_diff = end_memory - start_memory

        profile['memory_usage'] = memory_diff / 1024 / 1024
        
        # Calculate metrics
        duration = profile['duration']
        cpu_time = profile['cpu_time']
        
        if duration > 0:
            profile['parallelization'] = min(cpu_time / duration, self.platform_info['cpu_count_logical'])
            profile['cpu_utilization'] = min(cpu_time / duration * 100, 100)
            
            # Calculate Amdahl's Law speedup
            serial_fraction = max(0, 1 - profile['parallelization'] / self.platform_info['cpu_count_logical'])
            max_speedup = 1 / (serial_fraction + (1 - serial_fraction) / self.platform_info['cpu_count_logical'])
            profile['amdahl_speedup'] = max_speedup
            
            # Calculate Universal Scalability Law metrics
            # coherency_cost = 0.1  # This is an example value, adjust as needed
            # contention_cost = 0.05  # This is an example value, adjust as needed
            # n = self.platform_info['cpu_count_logical']
            # usl_speedup = (n) / (1 + contention_cost * (n - 1) + coherency_cost * n * (n - 1))
            # profile['usl_speedup'] = usl_speedup
        else:
            profile['parallelization'] = 1.0
            profile['cpu_utilization'] = 100
            profile['amdahl_speedup'] = 1.0
            # profile['usl_speedup'] = 1.0

        profile['platform_info'] = self.platform_info

        display({
            "application/vnd.miniprof+json": profile
        }, raw=True)

def load_ipython_extension(ipython):
    profiler = MiniProf(ipython)
    profiler.register(ipython)
    ipython.user_ns["mini_prof"] = profiler

if __name__ == "__main__":
    load_ipython_extension(get_ipython())