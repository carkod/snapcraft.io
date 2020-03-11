# syntax=docker/dockerfile:experimental

# Build stage: Install python dependencies
# ===
FROM ubuntu:focal AS python-dependencies
RUN apt-get update && apt-get install --yes python3 python3-setuptools python3-pip libsodium-dev
ADD requirements.txt /tmp/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip pip3 install --user --requirement /tmp/requirements.txt


# Build stage: Install yarn dependencies
# ===
FROM node:10-slim AS yarn-dependencies
WORKDIR /srv
ADD package.json .
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn yarn install

# Build stage: Run "yarn run build-js"
# ===
FROM yarn-dependencies AS build-js
WORKDIR /srv
ADD static/js static/js
ADD webpack.config.js .
RUN yarn run build-js

# Build stage: Run "yarn run build-css"
# ===
FROM yarn-dependencies AS build-css
ADD static/sass static/sass
RUN yarn run build-css


# Build stage: Run "yarn run get-licenses"
# ===
# FROM yarn-dependencies AS get-licenses
# COPY webapp/licenses.json webapp/licenses.json
# RUN yarn run get-licenses

# Build the production image
# ===
FROM ubuntu:focal

COPY . .
# Install python and import python dependencies
RUN apt-get update && apt-get install --no-install-recommends --yes python3 python3-setuptools python3-pip libsodium-dev
COPY --from=python-dependencies /root/.local/lib/python3.8/site-packages /root/.local/lib/python3.8/site-packages
COPY --from=python-dependencies /root/.local/bin /root/.local/bin
ENV PATH="/root/.local/bin:${PATH}"
# Set which webapp configuration to load
ARG WEBAPP=snapcraft
ENV WEBAPP "${WEBAPP}"

# Import code, build assets and mirror list
COPY . .
RUN rm -rf package.json yarn.lock .babelrc webpack.config.js requirements.txt
COPY --from=build-css /srv/static/css static/css
COPY --from=build-js /srv/static/js static/js

# Set revision ID
ARG BUILD_ID
ENV TALISKER_REVISION_ID "${BUILD_ID}"



# Setup commands to run server
ENTRYPOINT ["./entrypoint"]
CMD ["0.0.0.0:80"]

# FROM ubuntu:bionic

# # Set up environment
# ENV LANG C.UTF-8
# WORKDIR /srv

# # System dependencies
# RUN apt-get update && apt-get install --no-install-recommends --yes python3 python3-setuptools python3-pip libsodium-dev

# # Import code, install code dependencies
# ADD . .
# RUN python3 -m pip install --no-cache-dir -r requirements.txt

# # Set git commit ID
# ARG COMMIT_ID
# RUN echo "${COMMIT_ID}" > version-info.txt
# ENV COMMIT_ID "${COMMIT_ID}"

# # Set which webapp configuration to load
# ARG WEBAPP=snapcraft
# ENV WEBAPP "${WEBAPP}"

# # Setup commands to run server
# ENTRYPOINT ["./entrypoint"]
# CMD ["0.0.0.0:80"]

