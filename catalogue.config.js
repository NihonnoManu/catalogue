module.exports = {  
  name: 'catalogue',

  script: 'server/index.ts',
  interpreter: 'node',
  interpreter_args: '--import tsx',

  exec_mode: 'cluster',
  instances: 2,

  // other PM2 configuration options
}
