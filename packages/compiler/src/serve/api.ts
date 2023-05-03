import axios from 'axios';

axios.interceptors.request.use(function (config) {
    config.url += '?dev=1'
    return config;
}, function (error) {
    return Promise.reject(error);
});

export default axios