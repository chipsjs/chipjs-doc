/**
 * define process config,but config will overwrite by process.env
 *
 *
 * @author Kris Xu
 * @date 2019/12/18
 */
const config = require('config');

class Setting {
    constructor() {
        this._config = {};
    }

    static getInstance() {
        if(!this._instance) {
            this._instance = new Setting();
        }

        return this._instance;
    }

    async _loadBaseConfig() {

    }

    async _loadEnvConfig() {
        this._config.env = typeof process.env.ENV !== "undefined" ? process.env.ENV : config.get("env");
        this._config.api_doc_path = typeof process.env.API_DOC_PATH !== "undefined" ? process.env.API_DOC_PATH : config.get("api_doc_path");
        this._config.base_test_case_path = typeof process.env.BASE_TEST_CASE_PATH !== "undefined" ? process.env.BASE_TEST_CASE_PATH : config.get("base_test_case_path");
    }

    async init() {
        await this._loadBaseConfig();
        await this._loadEnvConfig();
    }
}

module.exports = Setting;