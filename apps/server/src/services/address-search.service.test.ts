import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatLvivAddress,
  normalizeBuildingToken,
  parseAddressQuery,
} from './address-search.service.js';

describe('parseAddressQuery', () => {
  it('розбирає однорядковий запит вулиця + будинок', () => {
    assert.deepEqual(parseAddressQuery('вел 50'), {
      streetQuery: 'вел',
      buildingQuery: '50',
    });

    assert.deepEqual(parseAddressQuery('величковського 50а'), {
      streetQuery: 'величковського',
      buildingQuery: '50а',
    });

    assert.deepEqual(parseAddressQuery('городоцька 12/2'), {
      streetQuery: 'городоцька',
      buildingQuery: '12/2',
    });

    assert.deepEqual(parseAddressQuery('вул. Стрийська, 45-б'), {
      streetQuery: 'стрийська',
      buildingQuery: '45-б',
    });

    assert.deepEqual(parseAddressQuery('величковського 50 а'), {
      streetQuery: 'величковського',
      buildingQuery: '50 а',
    });
  });

  it('нормалізує літери та дефіси в номерах будинків', () => {
    assert.equal(normalizeBuildingToken('50-А'), '50а');
    assert.equal(normalizeBuildingToken('50a'), '50а');
    assert.equal(normalizeBuildingToken('50 а'), '50а');
    assert.equal(normalizeBuildingToken('12/2'), '12/2');
  });

  it('форматує адресу Львова без дублювання префікса', () => {
    assert.equal(formatLvivAddress('Величковського І.', '50'), 'вул. Величковського І., 50');
    assert.equal(formatLvivAddress('просп. Свободи', '10'), 'просп. Свободи, 10');
    assert.equal(formatLvivAddress('проспект Свободи', '10'), 'проспект Свободи, 10');
  });
});
