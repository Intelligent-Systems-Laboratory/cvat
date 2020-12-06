// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

(() => {
    const FormData = require('form-data');
    const { ServerError } = require('./exceptions');
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

            Object.defineProperties(
                this,
                Object.freeze({
                    get: {
                        value: get,
                        writable: false,
                    },
                }),
            );
        }
    }

    class ServerProxy {
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

            async function about() {
                const { backendAPI } = config;

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/server/about`, {
                        proxy: config.proxy,
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }

                return response.data;
            }

            async function share(directory) {
                const { backendAPI } = config;
                directory = encodeURIComponent(directory);

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/server/share?directory=${directory}`, {
                        proxy: config.proxy,
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }

                return response.data;
            }

            async function exception(exceptionObject) {
                const { backendAPI } = config;

                try {
                    await Axios.post(`${backendAPI}/server/exception`, JSON.stringify(exceptionObject), {
                        proxy: config.proxy,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }
            }

            async function formats() {
                const { backendAPI } = config;

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/server/annotation/formats`, {
                        proxy: config.proxy,
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }

                return response.data;
            }

            async function userAgreements() {
                const { backendAPI } = config;
                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/restrictions/user-agreements`, {
                        proxy: config.proxy,
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }

                return response.data;
            }

            async function register(username, firstName, lastName, email, password1, password2, confirmations) {
                let response = null;
                try {
                    const data = JSON.stringify({
                        username,
                        first_name: firstName,
                        last_name: lastName,
                        email,
                        password1,
                        password2,
                        confirmations,
                    });
                    response = await Axios.post(`${config.backendAPI}/auth/register`, data, {
                        proxy: config.proxy,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }

                return response.data;
            }

            async function login(username, password) {
                const authenticationData = [
                    `${encodeURIComponent('username')}=${encodeURIComponent(username)}`,
                    `${encodeURIComponent('password')}=${encodeURIComponent(password)}`,
                ]
                    .join('&')
                    .replace(/%20/g, '+');

                Axios.defaults.headers.common.Authorization = '';
                let authenticationResponse = null;
                try {
                    authenticationResponse = await Axios.post(`${config.backendAPI}/auth/login`, authenticationData, {
                        proxy: config.proxy,
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }

                if (authenticationResponse.headers['set-cookie']) {
                    // Browser itself setup cookie and header is none
                    // In NodeJS we need do it manually
                    const cookies = authenticationResponse.headers['set-cookie'].join(';');
                    Axios.defaults.headers.common.Cookie = cookies;
                }

                token = authenticationResponse.data.key;
                store.set('token', token);
                Axios.defaults.headers.common.Authorization = `Token ${token}`;
            }

            async function logout() {
                try {
                    await Axios.post(`${config.backendAPI}/auth/logout`, {
                        proxy: config.proxy,
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }

                store.remove('token');
                Axios.defaults.headers.common.Authorization = '';
            }

            async function changePassword(oldPassword, newPassword1, newPassword2) {
                try {
                    const data = JSON.stringify({
                        old_password: oldPassword,
                        new_password1: newPassword1,
                        new_password2: newPassword2,
                    });
                    await Axios.post(`${config.backendAPI}/auth/password/change`, data, {
                        proxy: config.proxy,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }
            }

            async function requestPasswordReset(email) {
                try {
                    const data = JSON.stringify({
                        email,
                    });
                    await Axios.post(`${config.backendAPI}/auth/password/reset`, data, {
                        proxy: config.proxy,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }
            }

            async function resetPassword(newPassword1, newPassword2, uid, _token) {
                try {
                    const data = JSON.stringify({
                        new_password1: newPassword1,
                        new_password2: newPassword2,
                        uid,
                        token: _token,
                    });
                    await Axios.post(`${config.backendAPI}/auth/password/reset/confirm`, data, {
                        proxy: config.proxy,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }
            }

            async function authorized() {
                try {
                    await module.exports.users.getSelf();
                } catch (serverError) {
                    if (serverError.code === 401) {
                        return false;
                    }

                    throw serverError;
                }

                return true;
            }

            async function serverRequest(url, data) {
                try {
                    return (
                        await Axios({
                            url,
                            ...data,
                        })
                    ).data;
                } catch (errorData) {
                    throw generateError(errorData);
                }
            }

            async function getTasks(filter = '') {
                const { backendAPI } = config;

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/tasks?page_size=10&${filter}`, {
                        proxy: config.proxy,
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }

                response.data.results.count = response.data.count;
                return response.data.results;
            }

            async function saveTask(id, taskData) {
                const { backendAPI } = config;

                try {
                    await Axios.patch(`${backendAPI}/tasks/${id}`, JSON.stringify(taskData), {
                        proxy: config.proxy,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }
            }

            async function deleteTask(id) {
                const { backendAPI } = config;

                try {
                    await Axios.delete(`${backendAPI}/tasks/${id}`);
                } catch (errorData) {
                    throw generateError(errorData);
                }
            }

            async function exportDataset(id, format) {
                const { backendAPI } = config;
                let url = `${backendAPI}/tasks/${id}/dataset?format=${format}`;

                return new Promise((resolve, reject) => {
                    async function request() {
                        try {
                            const response = await Axios.get(`${url}`, {
                                proxy: config.proxy,
                            });
                            if (response.status === 202) {
                                setTimeout(request, 3000);
                            } else {
                                url = `${url}&action=download`;
                                resolve(url);
                            }
                        } catch (errorData) {
                            reject(generateError(errorData));
                        }
                    }

                    setTimeout(request);
                });
            }

            async function createTask(taskSpec, taskDataSpec, onUpdate) {
                const { backendAPI } = config;

                async function wait(id) {
                    return new Promise((resolve, reject) => {
                        async function checkStatus() {
                            try {
                                const response = await Axios.get(`${backendAPI}/tasks/${id}/status`);
                                if (['Queued', 'Started'].includes(response.data.state)) {
                                    if (response.data.message !== '') {
                                        onUpdate(response.data.message);
                                    }
                                    setTimeout(checkStatus, 1000);
                                } else if (response.data.state === 'Finished') {
                                    resolve();
                                } else if (response.data.state === 'Failed') {
                                    // If request has been successful, but task hasn't been created
                                    // Then passed data is wrong and we can pass code 400
                                    const message = `
                                        Could not create the task on the server. ${response.data.message}.
                                    `;
                                    reject(new ServerError(message, 400));
                                } else {
                                    // If server has another status, it is unexpected
                                    // Therefore it is server error and we can pass code 500
                                    reject(
                                        new ServerError(
                                            `Unknown task state has been received: ${response.data.state}`,
                                            500,
                                        ),
                                    );
                                }
                            } catch (errorData) {
                                reject(generateError(errorData));
                            }
                        }

                        setTimeout(checkStatus, 1000);
                    });
                }

                const taskData = new FormData();
                for (const [key, value] of Object.entries(taskDataSpec)) {
                    if (Array.isArray(value)) {
                        value.forEach((element, idx) => {
                            taskData.append(`${key}[${idx}]`, element);
                        });
                    } else {
                        taskData.set(key, value);
                    }
                }

                let response = null;

                onUpdate('The task is being created on the server..');
                try {
                    response = await Axios.post(`${backendAPI}/tasks`, JSON.stringify(taskSpec), {
                        proxy: config.proxy,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }

                onUpdate('The data are being uploaded to the server..');
                try {
                    await Axios.post(`${backendAPI}/tasks/${response.data.id}/data`, taskData, {
                        proxy: config.proxy,
                    });
                } catch (errorData) {
                    try {
                        await deleteTask(response.data.id);
                    } catch (_) {
                        // ignore
                    }

                    throw generateError(errorData);
                }

                try {
                    await wait(response.data.id);
                } catch (createException) {
                    await deleteTask(response.data.id);
                    throw createException;
                }

                const createdTask = await getTasks(`?id=${response.id}`);
                return createdTask[0];
            }

            async function getJob(jobID) {
                const { backendAPI } = config;

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/jobs/${jobID}`, {
                        proxy: config.proxy,
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }

                return response.data;
            }

            async function saveJob(id, jobData) {
                const { backendAPI } = config;

                try {
                    await Axios.patch(`${backendAPI}/jobs/${id}`, JSON.stringify(jobData), {
                        proxy: config.proxy,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }
            }

            async function getUsers(filter = 'page_size=all') {
                const { backendAPI } = config;

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/users?${filter}`, {
                        proxy: config.proxy,
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }

                return response.data.results;
            }

            async function getSelf() {
                const { backendAPI } = config;

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/users/self`, {
                        proxy: config.proxy,
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }

                return response.data;
            }

            async function getPreview(tid) {
                const { backendAPI } = config;

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/tasks/${tid}/data?type=preview`, {
                        proxy: config.proxy,
                        responseType: 'blob',
                    });
                } catch (errorData) {
                    const code = errorData.response ? errorData.response.status : errorData.code;
                    throw new ServerError(`Could not get preview frame for the task ${tid} from the server`, code);
                }

                return response.data;
            }

            async function getData(tid, chunk) {
                const { backendAPI } = config;

                let response = null;
                try {
                    response = await workerAxios.get(
                        `${backendAPI}/tasks/${tid}/data?type=chunk&number=${chunk}&quality=compressed`,
                        {
                            proxy: config.proxy,
                            responseType: 'arraybuffer',
                        },
                    );
                } catch (errorData) {
                    throw generateError(errorData);
                }

                return response;
            }

            async function getMeta(tid) {
                const { backendAPI } = config;

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/tasks/${tid}/data/meta`, {
                        proxy: config.proxy,
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }

                return response.data;
            }

            // Session is 'task' or 'job'
            async function getAnnotations(session, id) {
                const { backendAPI } = config;

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/${session}s/${id}/annotations`, {
                        proxy: config.proxy,
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }

                return response.data;
            }

            // Session is 'task' or 'job'
            async function updateAnnotations(session, id, data, action) {
                const { backendAPI } = config;
                let requestFunc = null;
                let url = null;
                if (action.toUpperCase() === 'PUT') {
                    requestFunc = Axios.put.bind(Axios);
                    url = `${backendAPI}/${session}s/${id}/annotations`;
                } else {
                    requestFunc = Axios.patch.bind(Axios);
                    url = `${backendAPI}/${session}s/${id}/annotations?action=${action}`;
                }

                let response = null;
                try {
                    response = await requestFunc(url, JSON.stringify(data), {
                        proxy: config.proxy,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }

                return response.data;
            }

            // Session is 'task' or 'job'
            async function uploadAnnotations(session, id, file, format) {
                const { backendAPI } = config;

                let annotationData = new FormData();
                annotationData.append('annotation_file', file);

                return new Promise((resolve, reject) => {
                    async function request() {
                        try {
                            const response = await Axios.put(
                                `${backendAPI}/${session}s/${id}/annotations?format=${format}`,
                                annotationData,
                                {
                                    proxy: config.proxy,
                                },
                            );
                            if (response.status === 202) {
                                annotationData = new FormData();
                                setTimeout(request, 3000);
                            } else {
                                resolve();
                            }
                        } catch (errorData) {
                            reject(generateError(errorData));
                        }
                    }

                    setTimeout(request);
                });
            }

            // Session is 'task' or 'job'
            async function dumpAnnotations(id, name, format) {
                const { backendAPI } = config;
                const baseURL = `${backendAPI}/tasks/${id}/annotations`;
                let query = `format=${encodeURIComponent(format)}`;
                if (name) {
                    const filename = name.replace(/\//g, '_');
                    query += `&filename=${encodeURIComponent(filename)}`;
                }
                let url = `${baseURL}?${query}`;

                return new Promise((resolve, reject) => {
                    async function request() {
                        Axios.get(`${url}`, {
                            proxy: config.proxy,
                        })
                            .then((response) => {
                                if (response.status === 202) {
                                    setTimeout(request, 3000);
                                } else {
                                    query = `${query}&action=download`;
                                    url = `${baseURL}?${query}`;
                                    resolve(url);
                                }
                            })
                            .catch((errorData) => {
                                reject(generateError(errorData));
                            });
                    }

                    setTimeout(request);
                });
            }

            async function saveLogs(logs) {
                const { backendAPI } = config;

                try {
                    await Axios.post(`${backendAPI}/server/logs`, JSON.stringify(logs), {
                        proxy: config.proxy,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }
            }

            // ISL AUTOFIT
            async function autoFit(id, frameNumber, points) {
                const { backendAPI } = config;
                const x1 = Math.trunc(points[0])
                const y1 = Math.trunc(points[1])
                const x2 = Math.trunc(points[2])
                const y2 = Math.trunc(points[3])

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/tasks/${id}/autofit`, {
                        proxy: config.proxy,
                        params: {
                            frameNumber: frameNumber,
                            x1: x1,
                            y1: y1,
                            x2: x2,
                            y2: y2,
                        }
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                    // console.log('Error receiving fitted coordinates, returning 0',errorData);
                    // return {
                    //     points: [0, 0, 0, 0],
                    // };
                }
                if(response.data){
                    return response.data;
                }
                else{
                    return {
                        points: [0, 0, 0, 0],
                    }
                }
            }
            // ISL END

            // ISL TRACKING
            async function tracking(id, objectID, frameStart, frameEnd, points) { // EDITED to include frame number, xtl, ytl, xbr, ybr
                console.log('TRACKING from server-proxy');
                const { backendAPI } = config;
                const x1 = Math.trunc(points[0])
                const y1 = Math.trunc(points[1])
                const x2 = Math.trunc(points[2])
                const y2 = Math.trunc(points[3])

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/tasks/${id}/tracking`, { // EDITED to  add the URL parameters instead
                        params: {
                            "object-id": objectID,
                            "frame-start": frameStart,
                            "frame-end": frameEnd,
                            x1: x1,
                            y1: y1,
                            x2: x2,
                            y2: y2,
                        }
                    });
                } catch (errorData) {
                    console.log('backend',backendAPI);
                    console.log(errorData);
                    throw generateError(errorData);
                }

                return response.data;
            }
            async function fetch(id,url,params) { // generic fetching
                const { backendAPI } = config;
                console.log('fetching ',url);
                console.log('params',params);
                let response = null;
                try {
                    if(params != null && url == 'tasks/1/ISLconfig'){
                        response = await Axios.post(`${backendAPI}/${url}`, { // EDITED to  add the URL parameters instead
                            params: params,
                        });
                    }else if(params == null && url == 'tasks/1/ISLconfig'){
                        response = await Axios.get(`${backendAPI}/${url}`, { // EDITED to  add the URL parameters instead

                        });
                    }else if(url==`tasks/${id}/predictBBs`){
                        console.log('predict bbs in server-proxy')
                        response = await Axios.get(`${backendAPI}/${url}`, { // EDITED to  add the URL parameters instead
                            params: {
                                frameNumber: params['frameNumber'],
                            }
                        });
                    }else if(url==`tasks/${id}/trackall`){
                        console.log('tracking all bbs server-proxy');
                        response = await Axios.post(`${backendAPI}/${url}`, { // EDITED to  add the URL parameters instead
                            params: {
                                framesToTrack: params['framesToTrack'],
                                bboxes: params['bboxes'],
                                frameStart: params['frameStart'],
                                objectID: params['ids']
                            }
                        });
                    }

                } catch (errorData) {
                    throw generateError(errorData);
                }

                return response.data;
            }
            // ISL END

            // ISL GLOBAL ATTRIBUTES
            async function updateLabels(id, data,selected) {
                const { backendAPI } = config;
                let task_details = {},labels = null;

                try {
                    task_details = await Axios.get(`${backendAPI}/tasks/${id}`, { // EDITED to  add the URL parameters instead
                        proxy: config.proxy,
                    });
                    labels = task_details.data.labels;
                } catch (errorData) {
                    throw generateError(errorData);
                }
                let update_details = {...task_details.data,
                }
                console.log(update_details.labels);
                for (let key in data) {
                    console.log('key', key);
                    let found = false;
                    for(let attribute of update_details.labels[0].attributes){
                        if(key == attribute.name){
                            console.log('found ',key,'in original labels');
                            found = true;
                            attribute.values = data[key];
                            attribute.default_value = selected[key];
                        }
                    }
                    if(!found){
                        // if key already exist in the attributes, do nothing
                        let new_attribute = {
                            name: key+"",
                            default_value: selected[key],
                            mutable: true,
                            input_type:"select",
                            values:data[key],
                        };
                        update_details.labels[0].attributes.push(new_attribute);

                    }
                }
                console.log('update_details', update_details);
                let update_detailsJSON = JSON.stringify(update_details);
                let updateLabel = null;
                try {
                    updateLabel = await Axios.put(`${backendAPI}/tasks/${id}`,
                    update_details
                    );
                } catch (errorData) {
                    throw generateError(errorData);
                }
                return updateLabel.data;
            }
            async function fetchAttributes(id){
                const { backendAPI } = config;
                let request = null;
                try {
                    request = await Axios.get(`${backendAPI}/tasks/${id}/getattributes`, { // EDITED to  add the URL parameters instead
                        proxy: config.proxy,
                    });
                } catch (errorData) {
                    console.log(errorData);
                    return {};
                }
                return request.data;
            }
            async function saveAttributes(id,attributes,selected){
                const { backendAPI } = config;
                let request = null;
                let data = {
                    attributes:attributes,
                    selected:selected
                }
                try {
                    request = await Axios.post(`${backendAPI}/tasks/${id}/saveattributes`, { // EDITED to  add the URL parameters instead
                        data
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }
                console.log(request.data.data)
                return request.data.data;
            }
            // ISL END
            async function getLambdaFunctions() {
                const { backendAPI } = config;

                try {
                    const response = await Axios.get(`${backendAPI}/lambda/functions`, {
                        proxy: config.proxy,
                    });
                    return response.data;
                } catch (errorData) {
                    throw generateError(errorData);
                }
            }

            async function runLambdaRequest(body) {
                const { backendAPI } = config;

                try {
                    const response = await Axios.post(`${backendAPI}/lambda/requests`, JSON.stringify(body), {
                        proxy: config.proxy,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    return response.data;
                } catch (errorData) {
                    throw generateError(errorData);
                }
            }

            async function callLambdaFunction(funId, body) {
                const { backendAPI } = config;

                try {
                    const response = await Axios.post(`${backendAPI}/lambda/functions/${funId}`, JSON.stringify(body), {
                        proxy: config.proxy,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    return response.data;
                } catch (errorData) {
                    throw generateError(errorData);
                }
            }

            async function getLambdaRequests() {
                const { backendAPI } = config;

                try {
                    const response = await Axios.get(`${backendAPI}/lambda/requests`, {
                        proxy: config.proxy,
                    });

                    return response.data;
                } catch (errorData) {
                    throw generateError(errorData);
                }
            }

            async function getRequestStatus(requestID) {
                const { backendAPI } = config;

                try {
                    const response = await Axios.get(`${backendAPI}/lambda/requests/${requestID}`, {
                        proxy: config.proxy,
                    });
                    return response.data;
                } catch (errorData) {
                    throw generateError(errorData);
                }
            }

            async function cancelLambdaRequest(requestId) {
                const { backendAPI } = config;

                try {
                    await Axios.delete(`${backendAPI}/lambda/requests/${requestId}`, {
                        method: 'DELETE',
                    });
                } catch (errorData) {
                    throw generateError(errorData);
                }
            }

            async function installedApps() {
                const { backendAPI } = config;
                try {
                    const response = await Axios.get(`${backendAPI}/server/plugins`, {
                        proxy: config.proxy,
                    });
                    return response.data;
                } catch (errorData) {
                    throw generateError(errorData);
                }
            }

            Object.defineProperties(this, Object.freeze({
                server: {
                    value: Object.freeze({
                        about,
                        share,
                        formats,
                        exception,
                        login,
                        logout,
                        changePassword,
                        requestPasswordReset,
                        resetPassword,
                        authorized,
                        register,
                        request: serverRequest,
                        userAgreements,
                        installedApps,
                    }),
                    writable: false,
                },

                tasks: {
                    value: Object.freeze({
                        getTasks,
                        saveTask,
                        createTask,
                        deleteTask,
                        exportDataset,
                        autoFit,           /*ISL AUTOFIT*/
                        /*ISL GLOBAL ATTRIBUTES*/
                        updateLabels,
                        fetchAttributes,
                        saveAttributes,
                        /*ISL END*/
                        // ISL TRACKING
                        tracking,
                        fetch,
                        // ISL END
                    }),
                    writable: false,
                },

                jobs: {
                    value: Object.freeze({
                        getJob,
                        saveJob,
                    }),
                    writable: false,
                },

                users: {
                    value: Object.freeze({
                        getUsers,
                        getSelf,
                    }),
                    writable: false,
                },

                frames: {
                    value: Object.freeze({
                        getData,
                        getMeta,
                        getPreview,
                    }),
                    writable: false,
                },

                annotations: {
                    value: Object.freeze({
                        updateAnnotations,
                        getAnnotations,
                        dumpAnnotations,
                        uploadAnnotations,
                    }),
                    writable: false,
                },

                logs: {
                    value: Object.freeze({
                        save: saveLogs,
                    }),
                    writable: false,
                },

                lambda: {
                    value: Object.freeze({
                        list: getLambdaFunctions,
                        status: getRequestStatus,
                        requests: getLambdaRequests,
                        run: runLambdaRequest,
                        call: callLambdaFunction,
                        cancel: cancelLambdaRequest,
                    }),
                    writable: false,
                },
            }));
        }
    }

    const serverProxy = new ServerProxy();
    module.exports = serverProxy;
})();
