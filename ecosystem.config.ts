module.exports = {
  apps: [
    {
      name: "nest-app",
      script: "dist/src/main.js",
      exec_mode: "fork", // 👈 이 부분 수정
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
