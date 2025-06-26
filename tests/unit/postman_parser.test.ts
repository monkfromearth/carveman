import { beforeEach, describe, expect, test } from 'bun:test';
import { PostmanParser } from '../../src/parser/postman_parser';
import type { IPostmanCollection } from '../../src/types/postman';

describe('PostmanParser', () => {
  let parser: PostmanParser;

  beforeEach(() => {
    parser = new PostmanParser();
  });

  describe('validateCollection', () => {
    test('should validate a valid Postman v2.1 collection', () => {
      const validCollection: IPostmanCollection = {
        info: {
          _postman_id: 'test-id',
          name: 'Test Collection',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: []
      };

      const result = parser.validateCollection(validCollection);
      expect(result.is_valid).toBe(true);
    });

    test('should return invalid for missing info object', () => {
      const invalidCollection = {
        item: []
      } as any;

      const result = parser.validateCollection(invalidCollection);
      expect(result.is_valid).toBe(false);
      expect(result.errors).toContain('Missing required "info" field');
    });

    test('should return invalid for missing name', () => {
      const invalidCollection: IPostmanCollection = {
        info: {
          _postman_id: 'test-id',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        } as any,
        item: []
      };

      const result = parser.validateCollection(invalidCollection);
      expect(result.is_valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid "info.name" field');
    });

    test('should return warning for invalid schema', () => {
      const invalidCollection: IPostmanCollection = {
        info: {
          _postman_id: 'test-id',
          name: 'Test Collection',
          schema:
            'https://schema.getpostman.com/json/collection/v1.0.0/collection.json'
        },
        item: []
      };

      const result = parser.validateCollection(invalidCollection);
      expect(result.warnings).toContain(
        'Schema version is not v2.1, some features may not work correctly'
      );
    });

    test('should return invalid for missing item array', () => {
      const invalidCollection = {
        info: {
          _postman_id: 'test-id',
          name: 'Test Collection',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        }
      } as any;

      const result = parser.validateCollection(invalidCollection);
      expect(result.is_valid).toBe(false);
      expect(result.errors).toContain('Missing required "item" field');
    });

    test('should handle malformed JSON gracefully', () => {
      expect(parser.validateCollection(null as any).is_valid).toBe(false);
      expect(parser.validateCollection(undefined as any).is_valid).toBe(false);
      expect(parser.validateCollection('invalid' as any).is_valid).toBe(false);
    });
  });

  describe('parseCollection', () => {
    test('should parse a simple collection with one request', () => {
      const collection: IPostmanCollection = {
        info: {
          name: 'Test Collection',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Test Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/test'
            }
          }
        ]
      };

      const result = parser.parseCollection(collection);

      expect(result.info.name).toBe('Test Collection');
      expect(result.items).toHaveLength(1);

      const firstItem = result.items[0];
      expect(firstItem).toBeDefined();
      if (firstItem) {
        expect(firstItem.original_name).toBe('Test Request');
        expect(firstItem.type).toBe('request');
      }
    });

    test('should parse nested folders', () => {
      const collection: IPostmanCollection = {
        info: {
          name: 'Nested Collection',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Parent Folder',
            item: [
              {
                name: 'Child Folder',
                item: [
                  {
                    name: 'Nested Request',
                    request: {
                      method: 'POST',
                      url: 'https://api.example.com/nested'
                    }
                  }
                ]
              }
            ]
          }
        ]
      };

      const result = parser.parseCollection(collection);

      expect(result.items).toHaveLength(1);

      const parentFolder = result.items[0];
      expect(parentFolder).toBeDefined();
      if (parentFolder) {
        expect(parentFolder.type).toBe('folder');
        expect(parentFolder.children).toHaveLength(1);

        const childFolder = parentFolder.children[0];
        expect(childFolder).toBeDefined();
        if (childFolder) {
          expect(childFolder.type).toBe('folder');
          expect(childFolder.children).toHaveLength(1);

          const nestedRequest = childFolder.children[0];
          expect(nestedRequest).toBeDefined();
          if (nestedRequest) {
            expect(nestedRequest.type).toBe('request');
          }
        }
      }
    });

    test('should handle empty collection', () => {
      const collection: IPostmanCollection = {
        info: {
          name: 'Empty Collection',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: []
      };

      const result = parser.parseCollection(collection);

      expect(result.info.name).toBe('Empty Collection');
      expect(result.items).toHaveLength(0);
    });

    test('should handle collection with variables', () => {
      const collection: IPostmanCollection = {
        info: {
          name: 'Collection with Variables',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        variable: [
          {
            key: 'baseUrl',
            value: 'https://api.example.com'
          },
          {
            key: 'apiKey',
            value: 'secret123'
          }
        ],
        item: [
          {
            name: 'Request with Variables',
            request: {
              method: 'GET',
              url: '{{baseUrl}}/test'
            }
          }
        ]
      };

      const result = parser.parseCollection(collection);

      expect(result.info.name).toBe('Collection with Variables');
      expect(result.metadata.variable).toHaveLength(2);
      expect(result.items).toHaveLength(1);
    });

    test('should handle collection with auth', () => {
      const collection: IPostmanCollection = {
        info: {
          name: 'Collection with Auth',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        auth: {
          type: 'bearer',
          bearer: [
            {
              key: 'token',
              value: '{{authToken}}'
            }
          ]
        },
        item: [
          {
            name: 'Authenticated Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/protected'
            }
          }
        ]
      };

      const result = parser.parseCollection(collection);

      expect(result.info.name).toBe('Collection with Auth');
      expect(result.metadata.auth).toBeDefined();
      expect(result.metadata.auth?.type).toBe('bearer');
    });

    test('should handle mixed content (folders and requests)', () => {
      const collection: IPostmanCollection = {
        info: {
          name: 'Mixed Collection',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Standalone Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/standalone'
            }
          },
          {
            name: 'Folder with Requests',
            item: [
              {
                name: 'Folder Request 1',
                request: {
                  method: 'POST',
                  url: 'https://api.example.com/folder1'
                }
              },
              {
                name: 'Folder Request 2',
                request: {
                  method: 'PUT',
                  url: 'https://api.example.com/folder2'
                }
              }
            ]
          },
          {
            name: 'Another Standalone Request',
            request: {
              method: 'DELETE',
              url: 'https://api.example.com/delete'
            }
          }
        ]
      };

      const result = parser.parseCollection(collection);

      expect(result.items).toHaveLength(3);

      // Check first item (standalone request)
      const firstItem = result.items[0];
      expect(firstItem).toBeDefined();
      if (firstItem) {
        expect(firstItem.type).toBe('request');
        expect(firstItem.original_name).toBe('Standalone Request');
      }

      // Check second item (folder)
      const secondItem = result.items[1];
      expect(secondItem).toBeDefined();
      if (secondItem) {
        expect(secondItem.type).toBe('folder');
        expect(secondItem.children).toHaveLength(2);
      }

      // Check third item (another standalone request)
      const thirdItem = result.items[2];
      expect(thirdItem).toBeDefined();
      if (thirdItem) {
        expect(thirdItem.type).toBe('request');
        expect(thirdItem.original_name).toBe('Another Standalone Request');
      }
    });
  });

  describe('error handling', () => {
    test('should handle empty collection', () => {
      const emptyCollection: IPostmanCollection = {
        info: {
          _postman_id: 'test-id',
          name: 'Empty Collection',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: []
      };

      const result = parser.parseCollection(emptyCollection);
      expect(result.items).toHaveLength(0);
    });
  });
});
