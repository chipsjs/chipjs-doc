# Chips-Doc Convert Module

- We wil auto convert chips-spec to swagger

## chips spec schema

- We support all chips-spec schema, you can get detail info according to the following contents
- Each api is key-value object, key is similar as `${method_type} ${api_name}`. The method_type in key is higher priority than value.
- Api_name supports /:id/ to mean varibale in path  
- Value supports properties:

Field Name | Type | Description
---|:---:|---
summary | `string` | api summary, it is correspond with Swagger.summary
note | `string` | note detail, it is correspond with Swagger.description
method/method_type | `string` | 1. case insensitive 2. it is lower priority than key.method_type
request | Request Object | optional, if undefined, Swagger.request won't exist
response | Response Object | optional, if undefined, Swagger.response exist and match swagger 3.0.0 stardard format

### Data Type

- key: '\${SupportedType} ${description}'

Field Name | SupportedType
---|:---:
string | 'string','\<string>','string:'
number | 'number','\<number>','number:'
integer | 'int','integer', '\<integer>'
array | [],'array'
object | 'object'
boolean | 'boolean', '\<boolean>'

### Request Object

Field Name | Type | Description
---|:---:|---
body | [Spec Object](#specObject) | http request body
query | [Spec Object](#specObject) | http request query

### Response Object

Field Name | Type | Description
---|:---:|---
body | [Spec Object](#specObject) | http response body

### <a name="specObject">Spec Object

- the normal spec schema such as:

```json
  body: {
    user: {
      email: 'string: user email',
      phone: 'string: user phone number,standard format is E164'
    }
  }
```

#### required/optional

- support two kinds of schema to express required/optional
- The first one looks like this:

```json
  body: {
    required: {
      email: 'string: user email',
      phone: 'string: user phone number,standard format is E164'
    }
  }
```

- You also can use [required]/[optional] to express, it looks like this:

```json
  body: {
    required: {
      email: '[required]string: user email',
      phone: '[optional]string: user phone number,standard format is E164'
    }
  }
```

### anyof/oneof

- case insensitive
- if key is anyof/oneof, it mean values are all optional
- for example

``` json
  body: {
    anyOf: {
      password: 'new password',
      FirstName: 'first name',
      LastName: 'last name',
    },
  }
```

### object

- if keys are related(the next key is ${prev_key}N), it will ignore

```json
  body: {
    users: {
      userid: 'xx',
      userid1: 'xxx',
      userid2: 'xxx',
      useridN: 'xxx'
    },
  }
```

- value supports array, number, object, string, function(such as the following eg, but not recommended)

```json
  body: {
      id: Number,
      msg: String
  }
```

### array

- [] means array
- support 1.object array, 2.string array 3.empty array
- If is object array, it will parse array[0].items to get each item properties

``` json
  body: {
    events: [{
      password: 'string new password',
      FirstName: 'string first name',
      LastName: 'string last name',
    }]
  }
```

- If is string array, it means each item in array is string and is the same capability

``` json
  body: {
    names: ['name', 'name1', 'name2']
  }
```

- If is empty array, it means ${key} data type is array, such as

``` json
  body: {
    names: [] // names is array
  }
```

#### ifPresent

- it is the special key as the same as optional
