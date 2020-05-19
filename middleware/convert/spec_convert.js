const fs = require('fs');
const _ = require('lodash');
const config = require('config');

const Base = require('../../lib/base_class');
const { Swagger, SwaggerDataType } = require('../../lib/swagger_convert');

class SpecConvert extends Base.factory() {
  static initialize({ log_module }) {
    this.loadInstance({
      read_only_properties: {
        logger: log_module || console
      }
    });
  }

  /**
   * parse description to get data type
   *
   * @param {string} description - '[optional] string: user email'
   * @return {string} type - string | number | object | array | boolean | unknown
   */
  _parseType(description) {
    const lower_case_description = description.toLowerCase();
    const prefix_type = lower_case_description.substr(0, 6);

    // there are two different schema: 1.[optional] string: or 2.String/string
    if (prefix_type === 'string' || lower_case_description.indexOf('string:') !== -1) {
      return SwaggerDataType.string;
    }

    if (prefix_type === 'number' || lower_case_description.indexOf('number:') !== -1) {
      return SwaggerDataType.number;
    }

    // A tricky way for match integer && <integer> &&
    // other cases when first ten characters have 'integer'
    if (lower_case_description === 'int' || lower_case_description.substr(0, 10).indexOf('integer') !== -1) {
      return SwaggerDataType.integer;
    }

    if (prefix_type === 'object') {
      return SwaggerDataType.object;
    }

    if (lower_case_description.substr(0, 5) === 'array') {
      return SwaggerDataType.array;
    }

    // A tricky way for match boolean && <boolean> &&
    // other cases when first ten characters have 'boolean'
    if (lower_case_description.substr(0, 10).indexOf('boolean') !== -1) {
      return SwaggerDataType.boolean;
    }

    return SwaggerDataType.unknown;
  }

  /**
   *
   * @param {object} schema - {pin: 'the pin for this user', slot: 'the slot for user'}
   * @param {boolean} isRequired - when is true, all params in shcema is required
   * @return {object} value
   * @return {object} value.convert_schema - {
   *    pin: {descriptions: 'the pin for this user', type: 'string' },
   *    slot: {descriptions: 'the slot for user', type: 'number' }
   * }
   * @return {array} value.required_param_arr -  ['pin', 'slot']
   */
  _parseDetailSchema(schema, isRequired = false) {
    let convert_schema = {};
    let prev_param_name;
    const required_param_set = Object.keys(schema).reduce((result, param_name) => {
      if (param_name === '...') return result;

      // param_name is userid2, prev_param_name is userid, param name will ignore
      if (param_name.indexOf(prev_param_name) === 0) {
        const different_string_part = param_name.substring(prev_param_name.length)
        const different_number_part = Number.parseInt(different_string_part, 10);
        if (!Number.isNaN(different_number_part) || different_string_part === 'N') {
          return result;
        }
      }

      const parameter_object = schema[param_name];
      if (!parameter_object) {
        convert_schema[param_name] = Swagger.generateSchemaByType(SwaggerDataType.unknown);
      } else {
        switch (typeof parameter_object) {
          case 'string':
            convert_schema[param_name] = Swagger.generateSchemaByType(this._parseType(parameter_object), parameter_object);
            if (!isRequired && parameter_object.indexOf('required') !== -1) {
              result.add(param_name);
            }
            break;
          case 'object':
            if (Swagger.isCombiningSchemas(param_name) || param_name === 'ifPresent' || param_name === 'optional' || param_name === 'header') {
              const child_convert_schema = this._parseDetailSchema(parameter_object, false);
              convert_schema = child_convert_schema.convert_schema;
              child_convert_schema.param_arr.forEach((item) => result.add(item));
              break;
            }

            if (param_name === 'required') {
              const child_convert_schema = this._parseDetailSchema(parameter_object, true);
              convert_schema = child_convert_schema.convert_schema;
              child_convert_schema.param_arr.forEach((item) => result.add(item));
              break;
            }

            if (Array.isArray(parameter_object)) {
              // default spec format is as the same as api_spec['3.0,0'].xxx.events
              if (parameter_object.length === 0) {
                convert_schema[param_name] = Swagger.generateSchemaByType(SwaggerDataType.array);
              } else {
                const temp_type = typeof parameter_object[0];
                if (temp_type === 'object') {
                  // default spec format is as the same as api_spec['3.0,0'].xxx.events
                  const convert_child_schema = this._parseDetailSchema(parameter_object[0]);
                  const items = Swagger.generateSchemaByType(SwaggerDataType.object, '', {
                    properties: convert_child_schema.convert_schema
                  });
                  convert_schema[param_name] = Swagger.generateSchemaByType(SwaggerDataType.array, '', { items });
                } else if (temp_type === 'string') {
                  // such as locks: ['lockid1', 'lockid2']
                  convert_schema[param_name] = Swagger.generateSchemaByType('array', parameter_object[0])
                }
              }
            } else {
              const convert_child_schema = this._parseDetailSchema(parameter_object);
              if (Object.keys(convert_child_schema) === 0) {
                convert_schema[param_name] = Swagger.generateSchemaByType(SwaggerDataType.object, '');
              } else {
                convert_schema[param_name] = Swagger.generateSchemaByType(SwaggerDataType.object, '', {
                  properties: convert_child_schema.convert_schema
                });
              }
            }
            break;
          case 'function': // super special schema, like spec[3.0.0].xxx.nextPage
            convert_schema[param_name] = Swagger.generateSchemaByType(this._parseType(schema[param_name].name, ''));
            break;
          default:
            convert_schema[param_name] = Swagger.generateSchemaByType(SwaggerDataType.unknown, '');
            break;
        }
      }

      if (isRequired) {
        result.add(param_name);
      }
      prev_param_name = param_name;

      return result;
    }, new Set());

    const param_arr = Array.from(required_param_set);
    return { convert_schema, param_arr }
  }

  /**
   * parse old_format_doc[api_name].request.body
   * @param {object} spec_schema - old_format_doc[api_name].request.body
   * @return {object} convert_query - api_doc[api_name].request.body
   */
  _parseSpecSchema(spec_schema) {
    // filter spec_schema is string
    if (typeof spec_schema !== 'object') return {};
    let required_param_arr = [];

    if (Array.isArray(spec_schema)) {
      const new_schema = {
        type: 'array',
        items: {}
      };
      if (spec_schema.length !== 0) {
        new_schema.items = {
          type: 'object',
          properties: this._parseDetailSchema(spec_schema[0]).convert_schema || {}
        };
      }

      return { new_schema, required_param_arr };
    }

    const new_schema = {
      type: 'object',
      properties: {}
    };

    const { convert_schema: new_detail_schema, param_arr } = this._parseDetailSchema(spec_schema);
    Object.assign(new_schema.properties, new_detail_schema);
    required_param_arr = required_param_arr.concat(param_arr)

    return { new_schema, required_param_arr };
  }

  /**
   * parse old_format_doc[api_name].request.body
   * @param {object} spec_schema - api_spec[api_name].request.body
   * @return {object} convert_request - api_doc[api_name].request
   */
  parseRequestBodySchema(spec_schema) {
    if (typeof spec_schema !== 'object' || Object.keys(spec_schema).length === 0) return null;

    const { new_schema, required_param_arr } = this._parseSpecSchema(spec_schema);
    return Swagger.convertJsonSchema2Swagger(new_schema, 'body', { required_param_arr })
  }

  /**
   * parse old_format_doc[api_name].request.query
   * @param {object} request - api_spec[api_name].request.body
   * @return {object} convert_request - api_doc[api_name].request
   */
  parseQuerySchema(spec_schema) {
    if (!spec_schema) return null;

    const { new_schema, required_param_arr } = this._parseSpecSchema(spec_schema);
    return Swagger.convertJsonSchema2Swagger(new_schema, 'query', { required_param_arr });
  }

  /**
   * parse old_format_doc[api_name].response
   * @param {object} spec_schema - api_spec[api_name].response
   * @return {object} convert_response - api_doc[api_name].response
   */
  parseResponseSchema(spec_schema) {
    if (!spec_schema) return null;

    const { new_schema } = this._parseSpecSchema(spec_schema);
    return Swagger.convertJsonSchema2Swagger(new_schema, 'response');
  }

  /**
   * parse path
   * @param {object} real_api_name - real_api_name
   * @return {object} convert_schema -
   */
  parsePathSchema(real_api_name) {
    if (!real_api_name) return null;

    const path_items = real_api_name.split('/');
    const new_schema = path_items.reduce((result, item) => {
      if (_.get(item, ['0']) === ':') {
        result.push(item.substr(1));
      }
      return result;
    }, []);
    return Swagger.convertJsonSchema2Swagger(new_schema, 'path');
  }

  /**
   * convert api spec to api doc json
   * @param {object} old_format_doc - key is api name,
   * value is detail info
   * @param {string} spec_output_path - output path
   * @return {object} new_format_doc - return api_doc_json, key is api name,
   * value is detail info follow the api doc, such as
  */
  run(old_format_doc, spec_output_path) {
    const path_items = {};
    let current_api_name = '';

    try {
      Object.keys(old_format_doc).forEach((api_name) => {
        current_api_name = api_name;
        let real_api_name = api_name;
        const api = old_format_doc[api_name];
        const method_type = (api.method || api.method_type).toLowerCase();
        let real_method_type = method_type;
        const index = api_name.lastIndexOf(' ');
        if (index !== -1) {
          // api_name is 'GET /test/:id/' and real_api_name is '/test/:id/'
          real_api_name = api_name.substring(index + 1);
          const start_index = api_name.indexOf(' ');
          real_method_type = api_name.substring(0, start_index).toLowerCase();
        }

        if (method_type !== real_method_type) {
          this.logger().error(`SpecConvert:: ${current_api_name} spec error! method type is ${method_type}, real method type is ${real_method_type}`);
        }

        if (!_.get(path_items, [real_api_name, 'parameters'])) {
          const parameters = this.parsePathSchema(real_api_name);
          if (parameters.length !== 0) {
            _.set(path_items, [real_api_name, 'parameters'], parameters);
          }
        }
        _.set(path_items, [real_api_name, real_method_type], Swagger.packagePathItem({
          summary: api.summary,
          description: api.note,
          body: this.parseRequestBodySchema(_.get(api, ['request', 'body'])),
          query: this.parseQuerySchema(_.get(api, ['request', 'query'])),
          response: this.parseResponseSchema(_.get(api, ['response', 'body'])),
        }));
      });
    } catch (err) {
      throw new TypeError(`SpecConvert::run: ${current_api_name} fail!err_msg: ${err.message}`);
    }

    const info_obj = Swagger.generateInfoObject('august-rest-api', 'If you want to refresh swagger, click terms of service and refersh the browser', config.get('terms_of_service'), '8.8.0');
    const openapi_obj = Swagger.generateOpenApiObject(info_obj, path_items);
    fs.writeFileSync(`${spec_output_path}.json`, JSON.stringify(openapi_obj, null, 2));

    return path_items;
  }

  readSwaggerJson(spec_output_path) {
    const content = fs.readFileSync(`${spec_output_path}.json`, 'utf8');
    return JSON.parse(content);
  }

  // parseApi(old_format_doc, spec_output_path) {

  // }
}

module.exports = SpecConvert;
