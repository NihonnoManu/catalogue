module.exports = {  
  name: 'optiond',

  script: './index.ts',
  interpreter: 'node',
  interpreter_args: '--import tsx',

  exec_mode: 'fork',
  instances: 1,
  autorestart : false

  // other PM2 configuration options
}
