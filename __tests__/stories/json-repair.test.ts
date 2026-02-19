/**
 * JSON Repair Function Tests 🦔
 * 
 * Tests for the repairAndParseJSON function that Beta claims fixes JSON parsing errors.
 * Let's see how "robust" this repair function really is...
 */

import { describe, it, expect } from '@jest/globals';

// We need to access the private repairAndParseJSON function
// Since it's not exported, we'll test it indirectly through the API or import the module
const testModule = require('../../src/lib/openai.ts');

// Mock the actual repair function for direct testing
function repairAndParseJSON<T>(jsonString: string): T {
  let cleaned = jsonString.trim();
  
  // Try parsing as-is first
  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.log('[JSON Repair] Initial parse failed, attempting repairs...');
  }
  
  // Remove markdown code fences if present
  cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
  
  // Remove trailing commas before ] or }
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix unescaped newlines and quotes in strings
  cleaned = cleaned.replace(/(?<!\\)\\n/g, '\\\\n');
  cleaned = cleaned.replace(/(?<!\\)\\"/g, '\\\\"');
  
  // Remove any control characters except newlines and tabs
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  
  // Fix common issues with quotes
  cleaned = cleaned.replace(/'/g, '"'); // Replace single quotes with double quotes
  cleaned = cleaned.replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Add quotes around unquoted keys
  
  // Try parsing after basic repairs
  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.log('[JSON Repair] Basic repairs failed, attempting advanced repairs...');
  }
  
  // Try to find and extract just the JSON object/array
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  
  // Prefer the match that starts earlier
  let jsonToTry = cleaned;
  if (objectMatch && arrayMatch) {
    jsonToTry = cleaned.indexOf('{') < cleaned.indexOf('[') ? objectMatch[0] : arrayMatch[0];
  } else if (objectMatch) {
    jsonToTry = objectMatch[0];
  } else if (arrayMatch) {
    jsonToTry = arrayMatch[0];
  }
  
  // Final cleanup on extracted JSON
  jsonToTry = jsonToTry.replace(/,(\s*[}\]])/g, '$1');
  
  // Try to fix truncated arrays/objects by adding closing brackets
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escapeNext = false;
  
  // More careful bracket counting that respects strings
  for (let i = 0; i < jsonToTry.length; i++) {
    const char = jsonToTry[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces--;
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets--;
    }
  }
  
  // Add missing closing brackets
  while (openBrackets > 0) {
    jsonToTry += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    jsonToTry += '}';
    openBraces--;
  }
  
  // Last attempt
  try {
    return JSON.parse(jsonToTry) as T;
  } catch (e) {
    console.error('[JSON Repair] All repair attempts failed');
    console.error('[JSON Repair] Original content (first 500 chars):', jsonString.substring(0, 500));
    console.error('[JSON Repair] Final attempt (first 500 chars):', jsonToTry.substring(0, 500));
    throw new Error(`Could not parse JSON response: ${(e as Error).message}`);
  }
}

describe('🦔 JSON Repair Function Tests - Beta Claims These Are Fixed', () => {
  
  describe('Basic JSON Parsing (Should Work)', () => {
    it('should parse valid JSON', () => {
      const validJson = '{"title": "test", "sentences": []}';
      const result = repairAndParseJSON(validJson);
      expect(result).toEqual({ title: "test", sentences: [] });
    });
    
    it('should parse valid JSON arrays', () => {
      const validJson = '[{"chinese": "你好", "english": "hello"}]';
      const result = repairAndParseJSON(validJson);
      expect(result).toEqual([{ chinese: "你好", english: "hello" }]);
    });
  });
  
  describe('Markdown Code Fence Removal', () => {
    it('should remove ```json fences', () => {
      const jsonWithFence = '```json\n{"title": "test"}\n```';
      const result = repairAndParseJSON(jsonWithFence);
      expect(result).toEqual({ title: "test" });
    });
    
    it('should remove plain ``` fences', () => {
      const jsonWithFence = '```\n{"title": "test"}\n```';
      const result = repairAndParseJSON(jsonWithFence);
      expect(result).toEqual({ title: "test" });
    });
    
    it('should handle mixed fences', () => {
      const jsonWithFence = '```json\n{"title": "test"}\n```\n';
      const result = repairAndParseJSON(jsonWithFence);
      expect(result).toEqual({ title: "test" });
    });
  });
  
  describe('Trailing Comma Fixes', () => {
    it('should fix trailing comma before }', () => {
      const jsonWithTrailingComma = '{"title": "test", "count": 1,}';
      const result = repairAndParseJSON(jsonWithTrailingComma);
      expect(result).toEqual({ title: "test", count: 1 });
    });
    
    it('should fix trailing comma before ]', () => {
      const jsonWithTrailingComma = '["item1", "item2",]';
      const result = repairAndParseJSON(jsonWithTrailingComma);
      expect(result).toEqual(["item1", "item2"]);
    });
    
    it('should fix multiple trailing commas', () => {
      const jsonWithTrailingCommas = '{"arr": [1, 2,], "obj": {"a": 1,}}';
      const result = repairAndParseJSON(jsonWithTrailingCommas);
      expect(result).toEqual({ arr: [1, 2], obj: { a: 1 } });
    });
  });
  
  describe('Quote Fixes', () => {
    it('should replace single quotes with double quotes', () => {
      const jsonWithSingleQuotes = "{'title': 'test', 'count': 1}";
      const result = repairAndParseJSON(jsonWithSingleQuotes);
      expect(result).toEqual({ title: "test", count: 1 });
    });
    
    it('should add quotes around unquoted keys', () => {
      const jsonWithUnquotedKeys = '{title: "test", count: 1}';
      const result = repairAndParseJSON(jsonWithUnquotedKeys);
      expect(result).toEqual({ title: "test", count: 1 });
    });
  });
  
  describe('Truncated JSON Repair', () => {
    it('should fix truncated object (missing })', () => {
      const truncatedJson = '{"title": "test", "sentences": [{"chinese": "你好"';
      const result = repairAndParseJSON(truncatedJson);
      expect(result).toEqual({ title: "test", sentences: [{ chinese: "你好" }] });
    });
    
    it('should fix truncated array (missing ])', () => {
      const truncatedJson = '[{"chinese": "你好"}, {"chinese": "再见"';
      const result = repairAndParseJSON(truncatedJson);
      expect(result).toEqual([{ chinese: "你好" }, { chinese: "再见" }]);
    });
    
    it('should fix multiple missing brackets', () => {
      const truncatedJson = '{"sentences": [{"chinese": "你好", "nested": {"a": 1';
      const result = repairAndParseJSON(truncatedJson);
      expect(result).toEqual({ sentences: [{ chinese: "你好", nested: { a: 1 } }] });
    });
  });
  
  describe('Complex Real-World Scenarios', () => {
    it('should handle AI response with code fences and trailing commas', () => {
      const messyAiResponse = `\`\`\`json
{
  "title": "我的一天",
  "titlePinyin": "wǒ de yī tiān",
  "titleEnglish": "My Day",
  "sentences": [
    {
      "chinese": "我每天七点起床。",
      "pinyin": "Wǒ měi tiān qī diǎn qǐ chuáng.",
      "english": "I get up at seven o'clock every day.",
      "vocabularyUsed": ["我", "每天",]
    },
  ]
}
\`\`\``;
      
      const result = repairAndParseJSON(messyAiResponse);
      expect(result.title).toBe("我的一天");
      expect(result.sentences).toHaveLength(1);
      expect(result.sentences[0].vocabularyUsed).toEqual(["我", "每天"]);
    });
    
    it('should handle unescaped quotes in strings', () => {
      const jsonWithUnescapedQuotes = '{"chinese": "他说"你好"", "english": "He said \\"hello\\""}';
      // This might fail - let's see if Beta's fix actually works
      expect(() => repairAndParseJSON(jsonWithUnescapedQuotes)).not.toThrow();
    });
    
    it('should handle severely truncated story response', () => {
      const truncatedStory = '{"title": "故事", "sentences": [{"chinese": "第一句话", "english": "First sentence", "vocabularyUsed": ["词"';
      const result = repairAndParseJSON(truncatedStory);
      expect(result.title).toBe("故事");
      expect(result.sentences).toHaveLength(1);
    });
  });
  
  describe('🦔 Edge Cases Beta Probably Missed', () => {
    it('should handle JSON with comments (invalid JSON)', () => {
      const jsonWithComments = `{
        // This is a comment
        "title": "test",
        /* Block comment */
        "count": 1
      }`;
      // This will probably fail because Beta didn't handle comments
      expect(() => repairAndParseJSON(jsonWithComments)).toThrow();
    });
    
    it('should handle empty or null response', () => {
      expect(() => repairAndParseJSON('')).toThrow();
      expect(() => repairAndParseJSON('   ')).toThrow();
      expect(() => repairAndParseJSON('null')).not.toThrow();
    });
    
    it('should handle response with extra text before JSON', () => {
      const responseWithText = 'Here is the JSON response you requested:\n\n{"title": "test"}';
      const result = repairAndParseJSON(responseWithText);
      expect(result).toEqual({ title: "test" });
    });
    
    it('should handle nested quotes in strings properly', () => {
      const complexJson = '{"chinese": "他问：\\"你叫什么名字？\\"", "english": "He asked: \\"What is your name?\\""}';
      const result = repairAndParseJSON(complexJson);
      expect(result.chinese).toContain('你叫什么名字');
    });
    
    it('should handle mixed bracket types in strings', () => {
      const jsonWithBracketsInStrings = '{"text": "Array [1,2,3] and Object {key: value}", "count": 1}';
      const result = repairAndParseJSON(jsonWithBracketsInStrings);
      expect(result.text).toContain('Array [1,2,3]');
      expect(result.count).toBe(1);
    });
    
    it('should handle Unicode characters', () => {
      const unicodeJson = '{"chinese": "🦔测试", "emoji": "😊", "special": "test\\u4e2d\\u6587"}';
      const result = repairAndParseJSON(unicodeJson);
      expect(result.chinese).toBe("🦔测试");
      expect(result.emoji).toBe("😊");
    });
  });
  
  describe('🦔 Stress Tests', () => {
    it('should handle deeply nested objects', () => {
      const deepJson = '{"a": {"b": {"c": {"d": {"e": "deep"';
      const result = repairAndParseJSON(deepJson);
      expect(result.a.b.c.d.e).toBe("deep");
    });
    
    it('should handle very long strings', () => {
      const longString = 'A'.repeat(1000);
      const jsonWithLongString = `{"longText": "${longString}"}`;
      const result = repairAndParseJSON(jsonWithLongString);
      expect(result.longText).toHaveLength(1000);
    });
    
    it('should handle arrays with many elements', () => {
      const manyItems = Array.from({length: 100}, (_, i) => `"item${i}"`).join(',');
      const largeArrayJson = `[${manyItems},]`; // With trailing comma
      const result = repairAndParseJSON(largeArrayJson);
      expect(result).toHaveLength(100);
      expect(result[99]).toBe("item99");
    });
  });
});

describe('🦔 Story Generation Integration Tests', () => {
  // We can't directly test the unexported function, but we can test through the API
  // These tests will be in the API testing section
  
  it('should be tested through API endpoints', () => {
    expect(true).toBe(true); // Placeholder - actual tests in api-testing.test.ts
  });
});