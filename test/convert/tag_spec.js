const { assert } = require('chai');
const fs = require('fs');

const Convert = require('../../middleware/convert/spec_convert');

describe('convert spec to auto generate tag', () => {
  let specJson = {};
  let specResult = {};

  before('init convert task', () => {
    Convert.initialize({ log_module: console });
  })

  describe('api name has multi path', () => {
    before('set source data', () => {
      specJson = {
        'Get /test/a': {
          method: 'post',
          response: {
            body: {
            }
          }
        }
      }
    });

    before('convert normal spec to api doc', () => {
      specResult = Convert.getInstance().run(specJson, 'test/convert/temp/tag');
    });

    it('should generate correct api doc', () => {
      const api_name = '/test/a';
      assert.exists(specResult[api_name]);
      assert.exists(specResult[api_name].get);
      assert.nestedPropertyVal(specResult[api_name], 'get.tags[0]', 'test');
    });

    after('clean file', () => {
      fs.unlinkSync('test/convert/temp/tag.json');
    });
  });

  describe('api name only has one path', () => {
    before('set source data', () => {
      specJson = {
        'Get /test': {
          method: 'post',
          response: {
            body: {
            }
          }
        }
      }
    });

    before('convert normal spec to api doc', () => {
      specResult = Convert.getInstance().run(specJson, 'test/convert/temp/tag');
    });

    it('should generate correct api doc', () => {
      const api_name = '/test';
      assert.exists(specResult[api_name]);
      assert.exists(specResult[api_name].get);
      assert.nestedPropertyVal(specResult[api_name], 'get.tags[0]', 'test');
    });

    after('clean file', () => {
      fs.unlinkSync('test/convert/temp/tag.json');
    });
  });

  describe('api name has :id', () => {
    before('set source data', () => {
      specJson = {
        'Get /test/A/:id': {
          method: 'post',
          response: {
            body: {
            }
          }
        }
      }
    });

    before('convert normal spec to api doc', () => {
      specResult = Convert.getInstance().run(specJson, 'test/convert/temp/tag');
    });

    it('should generate correct api doc', () => {
      const api_name = '/test/A/:id';
      assert.exists(specResult[api_name]);
      assert.exists(specResult[api_name].get);
      assert.nestedPropertyVal(specResult[api_name], 'get.tags[0]', 'A');
    });

    after('clean file', () => {
      fs.unlinkSync('test/convert/temp/tag.json');
    });
  });

  describe('api name only has A/:id', () => {
    before('set source data', () => {
      specJson = {
        'Get /test/:id': {
          method: 'post',
          response: {
            body: {
            }
          }
        }
      }
    });

    before('convert normal spec to api doc', () => {
      specResult = Convert.getInstance().run(specJson, 'test/convert/temp/tag');
    });

    it('should generate correct api doc', () => {
      const api_name = '/test/:id';
      assert.exists(specResult[api_name]);
      assert.exists(specResult[api_name].get);
      assert.nestedPropertyVal(specResult[api_name], 'get.tags[0]', 'test');
    });

    after('clean file', () => {
      fs.unlinkSync('test/convert/temp/tag.json');
    });
  });

  describe('api name like A/:id/:id', () => {
    before('set source data', () => {
      specJson = {
        'Get /test/:id/:id': {
          method: 'post',
          response: {
            body: {
            }
          }
        }
      }
    });

    before('convert normal spec to api doc', () => {
      specResult = Convert.getInstance().run(specJson, 'test/convert/temp/tag');
    });

    it('should generate correct api doc', () => {
      const api_name = '/test/:id/:id';
      assert.exists(specResult[api_name]);
      assert.exists(specResult[api_name].get);
      assert.nestedPropertyVal(specResult[api_name], 'get.tags[0]', 'test');
    });

    after('clean file', () => {
      fs.unlinkSync('test/convert/temp/tag.json');
    });
  });

  describe('api name like A/:id/B/:id', () => {
    before('set source data', () => {
      specJson = {
        'Get /A/:id/B/:id': {
          method: 'get',
          response: {
            body: {
            }
          }
        }
      }
    });

    before('convert normal spec to api doc', () => {
      specResult = Convert.getInstance().run(specJson, 'test/convert/temp/tag');
    });

    it('should generate correct api doc', () => {
      const api_name = '/A/:id/B/:id';
      assert.exists(specResult[api_name]);
      assert.exists(specResult[api_name].get);
      assert.nestedPropertyVal(specResult[api_name], 'get.tags[0]', 'A');
    });

    after('clean file', () => {
      fs.unlinkSync('test/convert/temp/tag.json');
    });
  });

  describe('api name like A/:id/B/:id', () => {
    before('set source data', () => {
      specJson = {
        'Get /A/:id/B/:id': {
          method: 'get',
          response: {
            body: {
            }
          }
        }
      }
    });

    before('extension tag overwrite base', () => {
      specResult = Convert.getInstance().syncSwaggerJson(specJson, {
        '/A/:id/B/:id': {
          get: {
            tags: ['C']
          }
        }
      }).paths;
    });

    it('should generate correct api doc', () => {
      const api_name = '/A/:id/B/:id';
      assert.exists(specResult[api_name]);
      assert.exists(specResult[api_name].get);
      assert.nestedPropertyVal(specResult[api_name], 'get.tags[0]', 'C');
    });
  });
});
