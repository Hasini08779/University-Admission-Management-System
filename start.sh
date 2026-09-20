#!/bin/bash

cd "/Users/hasini/Desktop/university admission system/backend"
npm install
npm start &
sleep 3
open "http://localhost:5001/index.html"
open "http://localhost:5001/admin-login.html"
