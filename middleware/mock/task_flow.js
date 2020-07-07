const _ = require('lodash');

const Task = require('./task');
const Report = require('./report');
const { loop } = require('../../lib');

class TaskFlow {
  constructor(user, log_module) {
    this._logger = log_module || console;
    this._reporter = new Report(user);
  }

  /**
   *
   *
   * @static
   * @param {string} step_name - step n's name, eg: '/user/:id@1'
   * @returns {{method_type: string, url: string}} eg: {'Get', '/user/:id'}
   * @memberof TaskFlow
   */
  static getApiInfoFromStepName(step_name) {
    const [method_type, api_name_with_suffix] = step_name.split(' ');

    const pos = api_name_with_suffix.indexOf('@');
    if (pos !== -1) {
      return {
        method_type,
        url: api_name_with_suffix.substr(0, pos)
      };
    }

    return { method_type, url: api_name_with_suffix };
  }

  // /**
  //  *
  //  *
  //  * @param {object} response_data - http response
  //  * @param {object} context_data - todo
  //  * @memberof TaskFlow
  //  */
  // _updateContext(response_data, context_data) {
  //   if (typeof context_data !== 'object' || Object.keys(context_data).length === 0) {
  //     Object.keys(this._context).forEach((key) => {
  //       if (_.has(response_data, key) && typeof response_data[key] !== 'undefined' && typeof response_data[key] !== 'object') {
  //         _.set(this._context, key, response_data[key]);
  //       }
  //     });
  //     return;
  //   }

  //   Object.entries(context_data).forEach(([key, value]) => {
  //     if (typeof value === 'string') {
  //       // _.set(this)
  //     } else if (typeof value === 'object') {
  //       // to do
  //     }
  //   });
  // }

  // /**
  //  *
  //  *
  //  * @param {object} response_data
  //  * @param {object} controller_data - key is 'a.key.subkey'
  //  * @memberof TaskFlow
  //  */
  // _updateController(response_data, controller_data) {
  //   Object.entries(controller_data).forEach(([key, value]) => {
  //     if (_.has(response_data, key)) {
  //     }
  //   });
  // }

  // _controlFlow(step_name) {

  // }

  /**
   *
   *
   * @param {object} swagger - swagger document
   * @param {{flow: string[], context: string[], extension: object}} api_flow - flow
   * @param {object} headers - http headers
   * @memberof TaskQueue
   */
  async execute(swagger, api_flow, headers = {}) {
    this.context = {
      current_task_id: '',
      flow: api_flow.flow,
      context: api_flow.context,
      extensions: api_flow.extensions
    }

    try {
      if (Array.isArray(context)) {
        this.context.params = context.reduce((result, key) => {
          _.set(result, key, null);
          return result;
        }, {});
      }

      await loop.forEach(this.context.flow.values(), async (task_id) => {
        this.context.current_task_id = task_id;
        this.context.swagger = swagger;

        const { method_type, url } = TaskFlow.getApiInfoFromStepName(task_id);

        const task = new Task({
          url,
          method_type,
          headers,
          context: this.context
        });

        await task.run();

        const {
          new_url, params, data, response
        } = this.context.result;
        this._reporter.addReport(task_id, new_url, params, data, response);
        // this._updateContext(response.data, _.get(extension, [step_name, 'response', 'context']));
        // this._updateController(response.data, _.get(extension, [step_name, 'response', 'controller']))
      });
    } catch (err) {
      this._reporter.addFailReport(this.context.current_task_id, _.get(this.context, ['result', 'response']), err.message);
      this._logger.error(`TaskQueue::excute fail, err msg is ${err.message}`);
    }

    this._reporter.report();
  }

  outputReport() {
    return this._reporter.outputReport();
  }

  destoryReport() {
    return this._reporter.destoryReport();
  }

  readReport() {
    return this._reporter.readReport();
  }
}

module.exports = TaskFlow;
