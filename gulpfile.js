'use strict';
const gulp    = require('gulp');
const install = require('gulp-install');
const connect = require('gulp-connect');

gulp.task('install', ()=>{
  gulp.src(['./backend/package.json', './frontend/package.json'])
    .pipe(install());
});

gulp.task('start', ()=>{
  connect.server({
    name: "backend",
    root: './backend/server.js',
    port: 4000
  });
  
  connect.server({
    name: "frontend",
    root: './frontend/server.js',
    port: 8000
  });
});

gulp.task('default', ['start']);
