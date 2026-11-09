# Sube el proyecto a GitHub con la API de git (sin el binario git): blobs → árbol → commit → rama.
require 'json'; require 'base64'; require 'tmpdir'
GH = File.expand_path('~/.local/bin/gh'); REPO = 'FranMaureiraR/magnar-flows'; BRANCH = ARGV[1] || 'rediseno-visual'
root = ARGV[0]; tmp = Dir.mktmpdir
def api(path, method: 'GET', body: nil, tmp:)
  args = [GH, 'api', path, '-X', method]
  if body then f = File.join(tmp, 'b.json'); File.write(f, JSON.generate(body)); args += ['--input', f] end
  out = IO.popen(args, err: [:child, :out], &:read); raise "#{path}: #{out[0, 300]}" unless $?.success?
  JSON.parse(out)
end
base = api("repos/#{REPO}/git/ref/heads/main", tmp: tmp)['object']['sha']
base_tree = api("repos/#{REPO}/git/commits/#{base}", tmp: tmp)['tree']['sha']
files = Dir.chdir(root) { Dir.glob('**/*', File::FNM_DOTMATCH).select { |p| File.file?(p) && !p.start_with?('screenshots/') && !p.end_with?('.DS_Store') && !p.include?('/.git/') } }
tree = files.map do |p|
  blob = api("repos/#{REPO}/git/blobs", method: 'POST', body: { content: Base64.strict_encode64(File.binread(File.join(root, p))), encoding: 'base64' }, tmp: tmp)
  { path: p, mode: '100644', type: 'blob', sha: blob['sha'] }
end
t = api("repos/#{REPO}/git/trees", method: 'POST', body: { base_tree: base_tree, tree: tree }, tmp: tmp)
msg = "Rediseño visual: Playbooks A (cards) y B (lista), Tasks en agenda\n\n- Playbooks A: cards nuevas, paginador, panel ajustable, transiciones y arreglo del resaltado al redimensionar.\n- Playbooks B: biblioteca en tabla que se angosta a columna al abrir un playbook.\n- Tasks: agenda por día con panel de la tarea; crear y editar en el mismo panel.\n- Datos de muestra simples y rutas relativas para publicar en GitHub Pages.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
c = api("repos/#{REPO}/git/commits", method: 'POST', body: { message: msg, tree: t['sha'], parents: [base] }, tmp: tmp)
begin
  api("repos/#{REPO}/git/refs", method: 'POST', body: { ref: "refs/heads/#{BRANCH}", sha: c['sha'] }, tmp: tmp)
rescue => e
  api("repos/#{REPO}/git/refs/heads/#{BRANCH}", method: 'PATCH', body: { sha: c['sha'], force: true }, tmp: tmp)
end
puts "files=#{files.size} commit=#{c['sha']} branch=#{BRANCH}"
