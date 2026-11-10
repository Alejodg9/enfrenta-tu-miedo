#!/usr/bin/env python3
"""Servidor local para la experiencia, con soporte HTTP Range para video."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
import re


class RangeRequestHandler(SimpleHTTPRequestHandler):
    range_match = re.compile(r"bytes=(\d*)-(\d*)$")

    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()
        try:
            file_handle = open(path, "rb")
        except OSError:
            self.send_error(404, "Archivo no encontrado")
            return None

        file_size = os.fstat(file_handle.fileno()).st_size
        content_type = self.guess_type(path)
        match = self.range_match.fullmatch(self.headers.get("Range") or "")
        if not match:
            self.send_response(200)
            self.send_header("Content-type", content_type)
            self.send_header("Content-Length", str(file_size))
            self.send_header("Accept-Ranges", "bytes")
            self.end_headers()
            return file_handle

        start_text, end_text = match.groups()
        if not start_text:
            length = min(int(end_text), file_size)
            start, end = file_size - length, file_size - 1
        else:
            start = int(start_text)
            end = min(int(end_text) if end_text else file_size - 1, file_size - 1)
        if start >= file_size or start > end:
            file_handle.close()
            self.send_error(416, "Rango no satisfacible")
            return None

        self.send_response(206)
        self.send_header("Content-type", content_type)
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        file_handle.seek(start)
        self._range_end = end
        return file_handle

    def copyfile(self, source, outputfile):
        range_end = getattr(self, "_range_end", None)
        if range_end is None:
            return super().copyfile(source, outputfile)
        remaining = range_end - source.tell() + 1
        while remaining:
            chunk = source.read(min(64 * 1024, remaining))
            if not chunk:
                break
            try:
                outputfile.write(chunk)
            except (BrokenPipeError, ConnectionResetError):
                break
            remaining -= len(chunk)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8000), RangeRequestHandler)
    print("Experiencia disponible en http://127.0.0.1:8000")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
