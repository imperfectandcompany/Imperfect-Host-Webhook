# Imperfect Host Webhook

This repository contains a simple Node.js application which listens for GitHub webhook events and automatically updates Docker containers based on the imperfect-gamers-site image from the GitHub Container Registry (GHCR). This setup ensures that our Docker containers are always running the latest version of the image immediately after new images are pushed to the registry.

![Imperfect Host Webhook Sequence Diagrarm](https://cdn.imperfectgamers.org/inc/assets/img/github/webhook_listener_sd.png)

## Table of Contents

- [Setup](#setup)
- [Installation](#installation)
- [Monitoring and Logs](#monitoring-and-logs)
- [Network Setup](#network-setup)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Setup

### Prerequisites

- Node.js (v12.x or higher)
- Docker and Docker Compose
- PM2 (Process Manager for Node.js)
- ShellJS (For executing shell commands via Node.js)

### Installation

#### 1. Clone this repository:
   ```bash
   git clone https://github.com/imperfectandcompany/imperfect-host-webhook.git
   ```
   
#### 2. Install dependencies:
   ```bash
   cd <directory_base>/imperfect-host-webhook
   npm install
   ```
#### 3. Environment Configuration
Copy `.env.example` to `.env` and set the appropriate values:
```bash
 PORT=3000
 WEBHOOK_TOKEN=OurGitHubWebhookSecretToken
```
Ensure the WEBHOOK_TOKEN matches the secret specified in our GitHub webhook configuration.

#### 4. Run the Application
Use PM2 to keep the server running:
```vim
pm2 start server.js --name webhook-listener
pm2 save
```
This command will start the webhook listener and ensure it restarts automatically if your server reboots.

#### 5. Configure GitHub Webhook
On GitHub, set up the webhook to interact with our service through repository settings.
- Payload URL: `http://<Our_Server_IP>:3000/webhook`
- Content type: `application/json`
- Secret: Use the `WEBHOOK_TOKEN` from our `.env` file.
- Events: Select the events that should trigger the webhook, such as updates to GitHub Packages.

#### 6. Docker Compose Setup
This webhook listener is designed to work with a `docker-compose.yml` located at `/srv/sites/docker-compose.yml`. Ensure the Docker Compose setup is correct and proxies requests correctly using NGINX.

#### 7. NGINX Configuration
We use NGINX on the host machine to manage traffic and SSL, including a reverse proxy setup that delegates webhook-related requests to our Node.js application and all other traffic to our containerized services.

Here’s the pertinent part of our NGINX config:
```NGINX
server {
    # ... SSL configuration ...

    location /webhook {
        proxy_pass http://localhost:3000/webhook;  # Forwards to Node.js app
        # ... additional proxy settings ...
    }

    location / {
        proxy_pass http://localhost:8080;  # Forwards to containerized services
        # ... additional proxy settings ...
    }
}
```
Adjust these paths and settings according to our specific deployment needs.

## Monitoring and Logs
To monitor the Node.js application or view logs:
```vim
pm2 status
pm2 logs webhook-listener
```

## Network Setup
Our infrastructure utilizes dual NGINX setups:
- The host NGINX server handles SSL traffic termination.
- Containerized NGINX instance manage internal routing.

The webhook listener updates Docker containers following GitHub events, ensuring a smooth CI/CD process.

### How It Works
- The host NGINX listens on port 443 for secure HTTPS traffic.
- A location block /webhook routes incoming webhook requests to the webhook listener running on the default port.
- For all other traffic, NGINX proxies requests to http://localhost:8080, forwarding them to the containerized services.

## Security
Our deployment process's integrity relies on token-based authentication for incoming webhook requests. This ensures that only authorized operations can update our services, aligning with stringent security protocols.

## Troubleshooting
If the webhook does not trigger:
- Check the payload URL in GitHub settings.
- Confirm that the server's port 3000 is accessible and not blocked.

If you encounter Docker-related errors:

- Review the Docker daemon logs.
- Ensure the docker-compose.yml is properly configured.
