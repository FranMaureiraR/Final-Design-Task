# Capturas 1440×900 con deviceScaleFactor 2 (mismo resultado que Playwright), una por estado.
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

BASE = ENV['BASE'] || 'http://localhost:5178'
ONLY = ARGV[0]
DIR = File.expand_path(__dir__)
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PORT = 9333 + rand(500)

# Acción JS: hace click en el primer botón cuyo texto sea `t`
def click(t)
  "[...document.querySelectorAll('button')].find(b => b.textContent.trim() === #{t.to_json})?.click()"
end

SHOTS = [
  # ---------------------------------------------------------- antes (original, sin modificar)
  ['original', '01-list',          '/playbooks/#/'],
  ['original', '02-new-playbook',  '/playbooks/#/', click('New Playbook')],
  ['original', '03-detail',        '/playbooks/#/pbk-01a1b29e-78ab'],
  ['original', '04-split-50',      '/playbooks-before/?split=50#/pbk-01a1b29e-78ab'],
  ['original', '05-split-60',      '/playbooks-before/?split=60#/pbk-01a1b29e-78ab'],
  # ---------------------------------------------------------- Rediseño A: Índice + panel
  ['playbooks-a', '01-list',           '/playbooks-a/#/'],
  ['playbooks-a', '02-empty',          '/playbooks-a/#/?empty=1'],
  ['playbooks-a', '03-new-contract',   '/playbooks-a/#/?new=1&start=contract&name=Servicios%20cloud&file=1'],
  ['playbooks-a', '04-new-describe',   '/playbooks-a/#/?new=1&start=describe&name=Servicios%20cloud&brief=1'],
  ['playbooks-a', '05-new-blank',      '/playbooks-a/#/?new=1&start=blank'],
  ['playbooks-a', '06-extracting',     '/playbooks-a/#/servicios-cloud?demo=loading&hold=1'],
  ['playbooks-a', '07-suggested',      '/playbooks-a/#/servicios-cloud?demo=suggested'],
  ['playbooks-a', '08-summary',        '/playbooks-a/#/nda-proveedores'],
  ['playbooks-a', '09-panel',          '/playbooks-a/#/nda-proveedores?rule=r2'],
  ['playbooks-a', '10-panel-expanded', '/playbooks-a/#/nda-proveedores?rule=r3&expand=1'],
  ['playbooks-a', '11-unsaved',        '/playbooks-a/#/nda-proveedores?dirty=1'],
  ['playbooks-a', '12-split-50',       '/playbooks-a/?split=50#/nda-proveedores'],
  ['playbooks-a', '13-split-50-panel', '/playbooks-a/?split=50#/nda-proveedores?rule=r2'],
  ['playbooks-a', '14-split-60',       '/playbooks-a/?split=60#/nda-proveedores'],
  # ---------------------------------------------------------- Rediseño B: Documento
  ['playbooks-b', '01-library',        '/playbooks-b/#/'],
  ['playbooks-b', '02-empty',          '/playbooks-b/#/?empty=1'],
  ['playbooks-b', '03-new',            '/playbooks-b/#/new'],
  ['playbooks-b', '04-new-contract',   '/playbooks-b/#/new?start=contract&file=1'],
  ['playbooks-b', '05-extracting',     '/playbooks-b/#/servicios-cloud?demo=loading&hold=1'],
  ['playbooks-b', '06-proposed',       '/playbooks-b/#/servicios-cloud?demo=suggested'],
  ['playbooks-b', '07-document',       '/playbooks-b/#/servicios-ti'],
  ['playbooks-b', '08-editing',        '/playbooks-b/#/servicios-ti?edit=r2'],
  ['playbooks-b', '09-edit-as-text',   '/playbooks-b/#/servicios-ti?edit=r2&text=1'],
  ['playbooks-b', '10-unsaved',        '/playbooks-b/#/servicios-ti?dirty=1'],
  ['playbooks-b', '11-split-50',       '/playbooks-b/?split=50#/servicios-ti'],
  ['playbooks-b', '12-split-60',       '/playbooks-b/?split=60#/servicios-ti'],
  # ---------------------------------------------------------- Rediseño C: Matriz de posiciones
  ['playbooks-c', '01-list',           '/playbooks-c/#/'],
  ['playbooks-c', '02-empty',          '/playbooks-c/#/?empty=1'],
  ['playbooks-c', '03-new',            '/playbooks-c/#/?new=1'],
  ['playbooks-c', '04-start',          '/playbooks-c/#/servicios-cloud?demo=start'],
  ['playbooks-c', '05-suggested',      '/playbooks-c/#/servicios-cloud?demo=suggested'],
  ['playbooks-c', '06-matrix',         '/playbooks-c/#/servicios-ti'],
  ['playbooks-c', '07-cell-editing',   '/playbooks-c/#/servicios-ti?cell=r4.fallback'],
  ['playbooks-c', '08-panel',          '/playbooks-c/#/servicios-ti?rule=r3'],
  ['playbooks-c', '09-panel-expanded', '/playbooks-c/#/servicios-ti?rule=r3&expand=1'],
  ['playbooks-c', '10-unsaved',        '/playbooks-c/#/servicios-ti?dirty=1'],
  ['playbooks-c', '11-split-50',       '/playbooks-c/?split=50#/servicios-ti'],
  ['playbooks-c', '12-split-60',       '/playbooks-c/?split=60#/servicios-ti'],
]

# ------------------------------------------------------------ cliente WebSocket mínimo (texto)
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
profile = Dir.mktmpdir
pid = spawn(CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', "--remote-debugging-port=#{PORT}",
            "--user-data-dir=#{profile}", '--window-size=1440,900', 'about:blank', %i[out err] => File::NULL)
begin
  page = nil
  50.times do
    begin
      page = JSON.parse(Net::HTTP.get(URI("http://127.0.0.1:#{PORT}/json/list"))).find { |t| t['type'] == 'page' }
      break if page
    rescue StandardError
      nil
    end
    sleep 0.2
  end
  abort 'Chrome no respondió' unless page
  cdp = CDP.new(WS.new(page['webSocketDebuggerUrl']))
  cdp.call('Page.enable')
  cdp.call('Emulation.setDeviceMetricsOverride', width: 1440, height: 900, deviceScaleFactor: 2, mobile: false)

  SHOTS.each do |folder, name, path, action|
    next if ONLY && ONLY != folder
    FileUtils.mkdir_p(File.join(DIR, folder))
    cdp.call('Page.navigate', url: 'about:blank') # recarga completa (los estados viven en la URL)
    cdp.call('Page.navigate', url: BASE + path)
    40.times { break if cdp.eval("document.readyState === 'complete' && document.fonts.status === 'loaded'"); sleep 0.15 }
    sleep 0.9
    if action
      cdp.eval(action)
      sleep 0.9
    end
    png = cdp.call('Page.captureScreenshot', format: 'png', captureBeyondViewport: false)['data']
    File.binwrite(File.join(DIR, folder, "#{name}.png"), Base64.decode64(png))
    puts "#{folder}/#{name}.png"
  end
ensure
  Process.kill('TERM', pid) rescue nil
  Process.wait(pid) rescue nil
  FileUtils.rm_rf(profile)
end
