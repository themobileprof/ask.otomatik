#!/bin/bash

# Decode the base64 encoded env file
echo "$ENV_FILE" | base64 -d > .env

# If we need different env files for frontend and backend
cp .env frontend/.env
cp .env backend/.env 