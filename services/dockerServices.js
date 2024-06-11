const shell = require('shelljs');

async function updateDockerServices() {
  const pullResult = await shell.exec(`docker compose -f /srv/sites/docker-compose.yml --env-file /srv/sites/.env pull`, { silent: true });
  if (pullResult.code !== 0) {
    throw new Error(`Docker pull failed: ${pullResult.stderr}`);
  }

  if (pullResult.stdout.includes('Image is up to date')) {
    return 'Docker images are up to date. No update needed.';
  }

  const upResult = await shell.exec(`docker compose -f /srv/sites/docker-compose.yml --env-file /srv/sites/.env up -d`, { silent: true });
  if (upResult.code !== 0) {
    throw new Error(`Docker up failed: ${upResult.stderr}`);
  }

  return 'Docker service updated successfully.';
}

module.exports = {
  updateDockerServices
};
