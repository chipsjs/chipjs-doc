const faker = require("json-schema-faker");

const api_doc_arr = require("../api_doc");
const api_flow_arr = require("../api_flow");

class Loader {
    constructor() {
        this._api_doc_map = new Map();
        this._test_case_map = {};
        this._logger = console;
    }

    static getInstance() {
        if(!this._instance) {
            this._instance = new Loader();
        }

        return this._instance;
    }

    init(log_module) {
        this._logger = log_module;
    }

    //generate_case module
    _docCheck(api_doc_info) {
        if(typeof api_doc_info.api_name === "undefined" || typeof api_doc_info.method_type === "undefined" || typeof api_doc_info.url === "undefined")  {
            throw new TypeError("Loader::_docCheck: api doc format error! api name is " + api_doc_info.api_name);
        }

        switch(api_doc_info.method_type) {
            case "get":
            case "post":
            case "put":
            case "delete":
                //do nothing;
                break;
            default:
                throw new TypeError("Loader::_docCheck: api doc format error! api name is " + api_doc_info.api_name);
        }

        return true;
    }

    async _overwriteByPublicParam(public_param_obj, api_result) {
        for(let i in api_result.body) {
            if(!public_param_obj.hasOwnProperty(i)) continue;

            if(!public_param_obj[i]) {
                public_param_obj[i] = api_result.body[i];
            } else {
                api_result.body[i] = public_param_obj[i];
            }
        }

        for(let i in api_result.query) {
            if(!public_param_obj.hasOwnProperty(i)) continue;

            if(!public_param_obj[i]) {
                public_param_obj[i] = api_result.query[i];
            } else {
                api_result.query[i] = public_param_obj[i];
            }
        }
    }

    async _overwriteBySpecialCondition(special_condition, api_result) {
        if(typeof special_condition !== "object") return;

        for(let i of Object.keys(special_condition)) {
            if(typeof api_result.query !=="object" || !api_result.query.hasOwnProperty(i)) continue;
            api_result.query[i] = special_condition[i];

            if(typeof api_result.body !=="object" || !api_result.body.hasOwnProperty(i)) continue;
            api_result.body[i] = special_condition[i];

            // if(typeof fixed_path !== "object") continue;
            // fixed_path[i] = special_condition[i];
        }
    }

    async _generatePath(special_condition, path_condition, api_result) {
        if(typeof special_condition !== "object" || typeof path_condition !== "object")  return;

        let path = await this._fakerData(path_condition);
        for(let i of Object.keys(special_condition)) {
            if(!path.hasOwnProperty(i)) continue;

            path[i] = special_condition[i];
        }

        for(let i of Object.keys(path)) {
            let temp_str = ":" + i;
            api_result.url = api_result.url.replace(temp_str, path[i]);
        }
    }

    async _fakerData(input) {
        return new Promise(resolve => {
            faker.resolve(input).then(result => {
                resolve(result);
            })
        });
    }

    async _parseDoc2Info({api_name = "", public_param_obj = {}, special_condition = {}}) {
        let api_info = this._api_doc_map.get(api_name);

        // if(typeof api_info === "undefined" ||  typeof api_info.request === "undefined") throw new TypeError("Loader::_parseDoc2Info:parser api_doc fail!!please check data type");
        let result = {
            api_name: api_info.api_name,
            method_type: api_info.method_type,
            url: api_info.url,
            response: api_info.response
        };

        if(typeof api_info.request.body !== "undefined") {
            result.body = await this._fakerData(api_info.request.body);
        }

        if(typeof api_info.request.query !== "undefined") {
            result.query = await this._fakerData(api_info.request.query);
        }

        await this._overwriteByPublicParam(public_param_obj, result);
        await this._overwriteBySpecialCondition(special_condition, result);
        await this._generatePath(special_condition, api_info.request.path ,result);

        return result;
    }

    //解析apidoc里的jsonschema + apiflow中的特定规则生成test_case;
    async _generateTestCaseFlow(api_flow) {
        let test_case_arr = [];
        let public_param_obj = {};

        if(Array.isArray(api_flow.public_param)) {
            for(let i in api_flow.public_param) {
                public_param_obj[api_flow.public_param[i]] = null;
            }
        }

        for(let i in api_flow.flow) {
            let api_name = api_flow.flow[i];
            if(!this._existInApiDoc(api_name)) {
                throw new TypeError("Loader::_generateTestCaseFlow: generate test case fail! The most likely reason is that " + api_name + " does not exist in api_doc.js or its format is error");
            }

            let api_result = await this._parseDoc2Info({
                api_name: api_name,
                public_param_obj: public_param_obj,
                special_condition: api_flow[api_name]
            });


            test_case_arr.push(api_result);
        }

        return test_case_arr;
    }

    loadApiDoc() {
        api_doc_arr.forEach(ele => {
            if(this._docCheck(ele)) {
                this._api_doc_map.set(ele.api_name, ele);
            }
        })
    }

    _existInApiDoc(key) {
        return this._api_doc_map.has(key);
    }

    async outputTestCaseFlow() {
        for(let i in api_flow_arr) {
            this._test_case_map[i] = await this._generateTestCaseFlow(api_flow_arr[i]);
        }

        return this._test_case_map;
    }
}

module.exports = Loader;