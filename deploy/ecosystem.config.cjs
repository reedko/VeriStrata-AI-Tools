module.exports = {
  apps: [{
    name: "veristrata-ai-tools",
    cwd: "/opt/VeriStrata-AI-Tools",
    script: "node_modules/tsx/dist/cli.mjs",
    args: "apps/tools-lab/server/index.ts",
    interpreter: "node",
    env: {
      NODE_ENV: "production",
      TOOLS_LAB_PORT: "8791",
      VERISTRATA_BASE_URL: "http://127.0.0.1:3000/api/v1/partner"
    },
    autorestart: true,
    max_restarts: 10,
    restart_delay: 2000,
    max_memory_restart: "350M"
  }]
};
