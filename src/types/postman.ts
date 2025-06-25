/**
 * TypeScript definitions for Postman Collection Format v2.1.0
 * Based on the official Postman Collection Schema
 */

// Base types
export interface IPostmanInfo {
  _postman_id?: string;
  name: string;
  description?: string;
  schema: string;
  _exporter_id?: string;
  version?: string;
}

export interface IPostmanVariable {
  key: string;
  value: string;
  type?: string;
  disabled?: boolean;
  description?: string;
}

export interface IPostmanScript {
  id?: string;
  type?: string;
  exec?: string | string[];
  src?: string;
  packages?: Record<string, any>;
}

export interface IPostmanEvent {
  listen: string;
  script: IPostmanScript;
  disabled?: boolean;
}

export interface IPostmanAuth {
  type: string;
  [key: string]: any;
}

// Request related types
export interface IPostmanUrl {
  raw: string;
  protocol?: string;
  host?: string | string[];
  port?: string;
  path?: string | string[];
  query?: IPostmanQueryParam[];
  hash?: string;
  variable?: IPostmanVariable[];
}

export interface IPostmanQueryParam {
  key: string;
  value?: string;
  disabled?: boolean;
  description?: string;
}

export interface IPostmanHeader {
  key: string;
  value: string;
  disabled?: boolean;
  description?: string;
  type?: string;
}

export interface IPostmanFormParam {
  key: string;
  value?: string;
  type?: string;
  src?: string;
  disabled?: boolean;
  description?: string;
}

export interface IPostmanBody {
  mode?: string;
  raw?: string;
  urlencoded?: IPostmanFormParam[];
  formdata?: IPostmanFormParam[];
  file?: {
    src: string;
  };
  graphql?: {
    query?: string;
    variables?: string;
  };
  options?: {
    raw?: {
      language?: string;
      headerFamily?: string;
    };
  };
  disabled?: boolean;
}

export interface IPostmanRequest {
  url: string | IPostmanUrl;
  method: string;
  header?: IPostmanHeader[];
  body?: IPostmanBody;
  auth?: IPostmanAuth;
  proxy?: any;
  certificate?: any;
  description?: string;
}

// Response types
export interface IPostmanResponse {
  id?: string;
  name?: string;
  originalRequest?: IPostmanRequest;
  status?: string;
  code?: number;
  _postman_previewlanguage?: string;
  header?: IPostmanHeader[];
  cookie?: any[];
  body?: string;
  timings?: any;
}

// Item types (requests and folders)
export interface IPostmanItem {
  id?: string;
  name: string;
  description?: string;
  variable?: IPostmanVariable[];
  event?: IPostmanEvent[];
  request?: IPostmanRequest;
  response?: IPostmanResponse[];
  item?: IPostmanItem[]; // For folders containing other items
  auth?: IPostmanAuth;
  protocolProfileBehavior?: any;
}

// Main collection type
export interface IPostmanCollection {
  info: IPostmanInfo;
  item: IPostmanItem[];
  variable?: IPostmanVariable[];
  event?: IPostmanEvent[];
  auth?: IPostmanAuth;
  protocolProfileBehavior?: any;
}

// File system structure types
export interface ICollectionMeta {
  type: 'collection';
  version: string;
  generated_by: string;
  generated_at: string;
}

export interface IFolderMeta {
  type: 'folder';
  parent_path: string;
}

export interface IRequestMeta {
  type: 'request';
  folder_path: string;
}

export interface ICollectionIndex {
  meta: ICollectionMeta;
  info: IPostmanInfo;
  variable?: IPostmanVariable[];
  event?: IPostmanEvent[];
  auth?: IPostmanAuth;
  protocolProfileBehavior?: any;
  order: string[];
}

export interface IFolderIndex {
  meta: IFolderMeta;
  name: string;
  description?: string;
  variable?: IPostmanVariable[];
  event?: IPostmanEvent[];
  auth?: IPostmanAuth;
  protocolProfileBehavior?: any;
  order: string[];
}

export interface IRequestFile {
  meta: IRequestMeta;
  name: string;
  description?: string;
  variable?: IPostmanVariable[];
  event?: IPostmanEvent[];
  request: IPostmanRequest;
  response?: IPostmanResponse[];
  auth?: IPostmanAuth;
  protocolProfileBehavior?: any;
}

// Utility types
export type PostmanItemType = 'folder' | 'request';

export interface IFileSystemItem {
  name: string;
  type: PostmanItemType;
  path: string;
  sanitized_name: string;
}

// CLI related types
export interface ISplitOptions {
  output?: string;
  overwrite?: boolean;
  dry_run?: boolean;
  verbose?: boolean;
}

export interface IBuildOptions {
  output?: string;
  validate?: boolean;
  verbose?: boolean;
}

export interface ICliCommand {
  command: 'split' | 'build' | 'help' | 'version';
  input_path: string;
  options: ISplitOptions | IBuildOptions;
}
