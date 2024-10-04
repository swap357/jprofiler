from .handlers import setup_handlers

try:
    from ._version import __version__
except ImportError:
    import warnings
    warnings.warn("Importing 'jprofiler' outside a proper installation.")
    __version__ = "dev"

def _jupyter_labextension_paths():
    return [{
        "src": "labextension",
        "dest": "jprofiler"
    }]

def _jupyter_server_extension_points():
    return [{
        "module": "jprofiler"
    }]

def _load_jupyter_server_extension(server_app):
    """
    Registers the API handler to receive HTTP requests from the frontend extension.

    Parameters
    ----------
    server_app: jupyterlab.labapp.LabApp
        JupyterLab application instance
    """
    setup_handlers(server_app.web_app)
    server_app.log.info(f"Registered jprofiler server extension")
