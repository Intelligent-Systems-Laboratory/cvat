/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
*/

(() => {
    const FormData = require('form-data');
    const {
        ServerError,
    } = require('./exceptions');
    const store = require('store');
    const config = require('./config');
    const DownloadWorker = require('./download.worker');

    function generateError(errorData) {
        if (errorData.response) {
            const message = `${errorData.message}. ${JSON.stringify(errorData.response.data) || ''}.`;
            return new ServerError(message, errorData.response.status);
        }

        // Server is unavailable (no any response)
        const message = `${errorData.message}.`; // usually is "Error Network"
        return new ServerError(message, 0);
    }

    class WorkerWrappedAxios {
        constructor() {
            const worker = new DownloadWorker();
            const requests = {};
            let requestId = 0;

            worker.onmessage = (e) => {
                if (e.data.id in requests) {
                    if (e.data.isSuccess) {
                        requests[e.data.id].resolve(e.data.responseData);
                    } else {
                        requests[e.data.id].reject(e.data.error);
                    }

                    delete requests[e.data.id];
                }
            };

            worker.onerror = (e) => {
                if (e.data.id in requests) {
                    requests[e.data.id].reject(e);
                    delete requests[e.data.id];
                }
            };

            function getRequestId() {
                return requestId++;
            }

            async function get(url, requestConfig) {
                return new Promise((resolve, reject) => {
                    const newRequestId = getRequestId();
                    requests[newRequestId] = {
                        resolve,
                        reject,
                    };
                    worker.postMessage({
                        url,
                        config: requestConfig,
                        id: newRequestId,
                    });
                });
            }

            Object.defineProperties(this, Object.freeze({
                get: {
                    value: get,
                    writable: false,
                },
            }));
        }
    }

    class Snap {
        constructor() {
            const Axios = require('axios');
            Axios.defaults.withCredentials = true;
            Axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
            Axios.defaults.xsrfCookieName = 'csrftoken';
            const workerAxios = new WorkerWrappedAxios();

            let token = store.get('token');
            if (token) {
                Axios.defaults.headers.common.Authorization = `Token ${token}`;
            }

            async function snapBoundingBox(x1, y1, x2, y2) {
                const { backendAPI } = config;

                let response = null;
                var bbox_points = [];
                try{
                    // EDIT HERE to change the URL being called
                    response = await Axios.get(`${backendAPI}/tasks/1/snap?xtl=${x1}&ytl=${y1}&xbr=${x2}&ybr=${y2}`, {
                    proxy: config.proxy,
                });}catch (errorData) {
                    throw generateError(errorData);
                }
                    const data = response.data.points;
                    console.log(data)
                
                // bbox_points.push(response.data);
                
                return response.data;
            }

            async function retrieveFrame(frame_no) {
                const { backendAPI } = config;

                let response1 = null;
                try {
                    // EDIT HERE to change the URL being called
                    response1 = await Axios.get(`${backendAPI}/tasks/1/data?type=frame&quality=original&number=${frame_no}`, {
                        proxy: config.proxy,
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }

                return response1.data;
            }


            Object.defineProperties(this, Object.freeze({
                snapping: {
                    value: Object.freeze({
                        snapBoundingBox,
                        retrieveFrame
                    }),
                    writable: false,
                },
            }));
        }
    }

    const snap = new Snap();
    module.exports = snap;
})();
