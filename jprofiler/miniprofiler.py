import json
import psutil
from IPython.core.getipython import get_ipython
from IPython.core.interactiveshell import ExecutionInfo, ExecutionResult, InteractiveShell
from IPython.display import JSON, display
from pyinstrument import Profiler
from pyinstrument.renderers.jsonrenderer import JSONRenderer

class MiniProf:
    def __init__(self, ip: InteractiveShell):
        self.ip = ip
        self.memory_usage = {}
        self.profiler = Profiler(async_mode="enabled")

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

        profile = self.profiler.output(renderer=JSONRenderer(show_all=False))
        profile = json.loads(profile)

        end_memory = psutil.Process().memory_info().rss
        start_memory = self.memory_usage.pop(cell_id, 0)
        memory_diff = end_memory - start_memory

        profile['memory_usage'] = memory_diff / 1024 / 1024

        display({
            "application/vnd.miniprof+json": profile
        }, raw=True)

def load_ipython_extension(ipython):
    profiler = MiniProf(ipython)
    profiler.register(ipython)
    ipython.user_ns["mini_prof"] = profiler

if __name__ == "__main__":
    load_ipython_extension(get_ipython())