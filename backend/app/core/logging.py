import logging
import sys

from loguru import logger


def setup_logging():
    # Remove default loguru handler
    logger.remove()

    # JSON-like structured format for production
    fmt = (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "{extra[request_id]} | "
        "<level>{message}</level>"
    )

    logger.configure(extra={"request_id": "-"})
    logger.add(sys.stdout, format=fmt, level="INFO", colorize=True, backtrace=True, diagnose=False)
    logger.add(
        "logs/app.log",
        format=fmt,
        level="INFO",
        rotation="100 MB",
        retention="30 days",
        compression="gz",
        backtrace=True,
        diagnose=False,
    )

    # Intercept standard library logging (uvicorn, sqlalchemy, celery)
    class InterceptHandler(logging.Handler):
        def emit(self, record: logging.LogRecord):
            try:
                level = logger.level(record.levelname).name
            except ValueError:
                level = record.levelno
            frame, depth = sys._getframe(6), 6
            while frame and frame.f_code.co_filename == logging.__file__:
                frame = frame.f_back
                depth += 1
            logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())

    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "sqlalchemy.engine", "celery"):
        logging.getLogger(name).handlers = [InterceptHandler()]
