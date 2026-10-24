import http.server, os, sys, functools
ROOT=os.path.dirname(os.path.abspath(__file__))
class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        cur=open(os.path.join(ROOT,'current')).read().strip()
        p=path.split('?',1)[0].split('#',1)[0]
        if not p.startswith('/wejdan-os/'): return os.path.join(ROOT,'__nope__')
        rel=p[len('/wejdan-os/'):] or 'index.html'
        if rel.endswith('/'): rel+='index.html'
        return os.path.join(ROOT,cur,rel)
    def end_headers(self):
        cur=open(os.path.join(ROOT,'current')).read().strip()
        p=self.path.split('?',1)[0]
        nostore=os.path.exists(os.path.join(ROOT,'nostore_subres')) and p.endswith(('.js',)) 
        self.send_header('Cache-Control','no-store' if nostore else 'max-age=600')
        super().end_headers()
    def log_message(self,fmt,*a):
        pass
http.server.ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1])),H).serve_forever()
