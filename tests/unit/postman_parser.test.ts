import { describe, test, expect, beforeEach } from "bun:test";
import { PostmanParser } from "../../src/parser/postman_parser";
import type { IPostmanCollection } from "../../src/types/postman";

describe("PostmanParser", () => {
  let parser: PostmanParser;

  beforeEach(() => {
    parser = new PostmanParser();
  });

  describe("validateCollection", () => {
    test("should validate a valid Postman v2.1 collection", () => {
      const validCollection: IPostmanCollection = {
        info: {
          _postman_id: "test-id",
          name: "Test Collection",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        item: []
      };

      const result = parser.validateCollection(validCollection);
      expect(result.is_valid).toBe(true);
    });

    test("should return invalid for missing info object", () => {
      const invalidCollection = {
        item: []
      } as any;

      const result = parser.validateCollection(invalidCollection);
      expect(result.is_valid).toBe(false);
      expect(result.errors).toContain('Missing required "info" field');
    });

    test("should return invalid for missing name", () => {
      const invalidCollection: IPostmanCollection = {
        info: {
          _postman_id: "test-id",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        } as any,
        item: []
      };

      const result = parser.validateCollection(invalidCollection);
      expect(result.is_valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid "info.name" field');
    });

    test("should return warning for invalid schema", () => {
      const invalidCollection: IPostmanCollection = {
        info: {
          _postman_id: "test-id",
          name: "Test Collection",
          schema: "https://schema.getpostman.com/json/collection/v1.0.0/collection.json"
        },
        item: []
      };

      const result = parser.validateCollection(invalidCollection);
      expect(result.warnings).toContain('Schema version is not v2.1, some features may not work correctly');
    });

    test("should return invalid for missing item array", () => {
      const invalidCollection = {
        info: {
          _postman_id: "test-id",
          name: "Test Collection",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        }
      } as any;

      const result = parser.validateCollection(invalidCollection);
      expect(result.is_valid).toBe(false);
      expect(result.errors).toContain('Missing required "item" field');
    });
  });

  describe("parseCollection", () => {
    test("should parse a simple collection with requests", () => {
      const collection: IPostmanCollection = {
        info: {
          _postman_id: "test-id",
          name: "Simple Collection",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        item: [
          {
            name: "Test Request",
            request: {
              method: "GET",
              header: [],
              url: {
                raw: "https://api.example.com/test",
                protocol: "https",
                host: ["api", "example", "com"],
                path: ["test"]
              }
            }
          }
        ]
      };

      const result = parser.parseCollection(collection);

      expect(result.info.name).toBe("Simple Collection");
      expect(result.items).toHaveLength(1);
      expect(result.items[0].original_name).toBe("Test Request");
      expect(result.items[0].type).toBe("request");
    });

    test("should parse collection with nested folders", () => {
      const collection: IPostmanCollection = {
        info: {
          _postman_id: "test-id",
          name: "Nested Collection",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        item: [
          {
            name: "API v1",
            item: [
              {
                name: "Users",
                item: [
                  {
                    name: "Get User",
                    request: {
                      method: "GET",
                      header: [],
                      url: {
                        raw: "https://api.example.com/v1/users/1",
                        protocol: "https",
                        host: ["api", "example", "com"],
                        path: ["v1", "users", "1"]
                      }
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
      expect(result.items[0].type).toBe("folder");
      expect(result.items[0].children).toHaveLength(1);
      expect(result.items[0].children[0].type).toBe("folder");
      expect(result.items[0].children[0].children).toHaveLength(1);
      expect(result.items[0].children[0].children[0].type).toBe("request");
    });

    test("should preserve collection variables", () => {
      const collection: IPostmanCollection = {
        info: {
          _postman_id: "test-id",
          name: "Collection with Variables",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        item: [],
        variable: [
          {
            key: "baseUrl",
            value: "https://api.example.com",
            type: "string"
          }
        ]
      };

      const result = parser.parseCollection(collection);

      expect(result.metadata.variable).toHaveLength(1);
      expect(result.metadata.variable[0].key).toBe("baseUrl");
      expect(result.metadata.variable[0].value).toBe("https://api.example.com");
    });

    test("should preserve collection auth", () => {
      const collection: IPostmanCollection = {
        info: {
          _postman_id: "test-id",
          name: "Collection with Auth",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        item: [],
        auth: {
          type: "bearer",
          bearer: [
            {
              key: "token",
              value: "{{authToken}}",
              type: "string"
            }
          ]
        }
      };

      const result = parser.parseCollection(collection);

      expect(result.metadata.auth).toBeDefined();
      expect(result.metadata.auth.type).toBe("bearer");
    });

    test("should preserve collection events", () => {
      const collection: IPostmanCollection = {
        info: {
          _postman_id: "test-id",
          name: "Collection with Events",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        item: [],
        event: [
          {
            listen: "prerequest",
            script: {
              type: "text/javascript",
              exec: ["console.log('Pre-request script');"]
            }
          }
        ]
      };

      const result = parser.parseCollection(collection);

      expect(result.metadata.event).toHaveLength(1);
      expect(result.metadata.event[0].listen).toBe("prerequest");
    });
  });

  describe("error handling", () => {
    test("should handle malformed JSON gracefully", () => {
      expect(() => parser.validateCollection(null as any)).toThrow();
      expect(() => parser.validateCollection(undefined as any)).toThrow();
      expect(() => parser.validateCollection("invalid" as any)).toThrow();
    });

    test("should handle empty collection", () => {
      const emptyCollection: IPostmanCollection = {
        info: {
          _postman_id: "test-id",
          name: "Empty Collection",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        item: []
      };

      const result = parser.parseCollection(emptyCollection);
      expect(result.items).toHaveLength(0);
    });
  });
}); 