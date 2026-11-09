# Capturas 1440×900 con deviceScaleFactor 2 (mismo resultado que Playwright), una por estado.
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; PORT = 9900 + rand(90)
# Controla Google Chrome por el protocolo DevTools; solo necesita Ruby (viene con macOS) y Chrome.
#
#   1. Servidor:  ruby -run -e httpd . -p 5178     (desde la raíz del repo)
#   2. Capturas:  ruby screenshots/shoot.rb                 # todas
#                 ruby screenshots/shoot.rb playbooks-a     # una carpeta
#                 BASE=http://localhost:5179 ruby screenshots/shoot.rb
require 'socket'
require 'json'
require 'base64'
require 'securerandom'
require 'net/http'
require 'uri'
require 'tmpdir'
require 'fileutils'

class WS
  def initialize(url)
    u = URI(url)
    @s = TCPSocket.new(u.host, u.port)
    key = Base64.strict_encode64(SecureRandom.random_bytes(16))
    @s.write("GET #{u.path} HTTP/1.1\r\nHost: #{u.host}:#{u.port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n" \
             "Sec-WebSocket-Key: #{key}\r\nSec-WebSocket-Version: 13\r\n\r\n")
    nil while @s.gets != "\r\n"
  end

  def send_text(str)
    data = str.b
    len = data.bytesize
    hdr = [0x81].pack('C')
    hdr << (len < 126 ? [0x80 | len].pack('C') : len < 65_536 ? [0x80 | 126, len].pack('Cn') : [0x80 | 127, len].pack('CQ>'))
    mask = SecureRandom.random_bytes(4)
    m = mask.bytes
    @s.write(hdr + mask + data.bytes.each_with_index.map { |b, i| b ^ m[i % 4] }.pack('C*'))
  end

  def recv
    buf = ''.b
    loop do
      b1, b2 = @s.read(2).unpack('CC')
      len = b2 & 0x7f
      len = @s.read(2).unpack1('n') if len == 126
      len = @s.read(8).unpack1('Q>') if len == 127
      buf << @s.read(len)
      return buf.force_encoding('UTF-8') if (b1 & 0x80) != 0
    end
  end
end

class CDP
  def initialize(ws)
    @ws = ws
    @id = 0
  end

  def call(method, params = {})
    id = (@id += 1)
    @ws.send_text({ id: id, method: method, params: params }.to_json)
    loop do
      msg = JSON.parse(@ws.recv)
      next unless msg['id'] == id
      raise "#{method}: #{msg['error']}" if msg['error']
      return msg['result']
    end
  end

  def eval(js)
    call('Runtime.evaluate', expression: js, awaitPromise: true, returnByValue: true).dig('result', 'value')
  end
end

# ------------------------------------------------------------ main
SPD=ARGV[0]
profile = Dir.mktmpdir
pid = spawn(CHROME, '--headless=new', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', "--remote-debugging-port=#{PORT}", "--user-data-dir=#{profile}", 'about:blank', %i[out err] => File::NULL)
begin
  page=nil
  50.times { begin; page = JSON.parse(Net::HTTP.get(URI("http://127.0.0.1:#{PORT}/json/list"))).find { |t| t['type'] == 'page' }; break if page; rescue; end; sleep 0.2 }
  cdp = CDP.new(WS.new(page['webSocketDebuggerUrl'])); cdp.call('Page.enable')
  cdp.call('Emulation.setDeviceMetricsOverride', width: 1440, height: 940, deviceScaleFactor: 1, mobile: false)
  cdp.call('Page.navigate', url: "file://#{SPD}/v.html"); sleep 2
  dur = cdp.eval("new Promise(r=>{const v=document.getElementById('v'); if(v.readyState>0) r(v.duration+' '+v.videoWidth+'x'+v.videoHeight); else {v.onloadedmetadata=()=>r(v.duration+' '+v.videoWidth+'x'+v.videoHeight); v.onerror=()=>r('err '+(v.error&&v.error.code))}})")
  puts dur
  d = dur.to_f
  t = 0.0; n = 0
  while t < d
    cdp.eval("new Promise(r=>{const v=document.getElementById('v'); v.onseeked=()=>setTimeout(r,80); v.currentTime=#{t}})")
    png = cdp.call('Page.captureScreenshot', format: 'jpeg', quality: 70)['data']
    File.binwrite(File.join(SPD, 'frames', format('f%03d_%04.1f.jpg', n, t)), Base64.decode64(png))
    t += (ENV["STEP"]||"1").to_f; n += 1
  end
  puts n
ensure
  Process.kill('TERM', pid) rescue nil
  FileUtils.rm_rf(profile)
end
