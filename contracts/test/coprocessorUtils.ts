import * as dotenv from 'dotenv';
import fs from 'fs';
import { ethers } from 'hardhat';
import { Database } from 'sqlite3';

import { FheType } from './codegen/common';
import operatorsPrices from './codegen/operatorsPrices.json';
import { ALL_FHE_TYPES } from './codegen/types';

const parsedEnvCoprocessor = dotenv.parse(fs.readFileSync('/root/Zama/fhevm_temp/test-suite/fhevm/env/staging/.env.host'));
const coprocAddress = parsedEnvCoprocessor.FHEVM_EXECUTOR_CONTRACT_ADDRESS;

const Abi = [
  'event Call(address indexed from, address indexed to, uint256 value, uint256 gas, bytes data, uint8 type)',
  'event StaticCall(address indexed from, address indexed to, uint256 gas, bytes data, uint8 type)',
  'event Create(address indexed from, address indexed to, uint256 value, bytes data, uint8 type)',
  'event DelegateCall(address indexed from, address indexed to, uint256 gas, bytes data, uint8 type)',
  'event FheCall(bytes data)',
  'event FheStaticCall(bytes data)',
  'event FheDelegateCall(bytes data)',
  'event FheCreate(bytes data)',
  'event FheAdd(bytes32, bytes32, bytes32, bytes1, bytes32)',
  'event FheSub(bytes32, bytes32, bytes32, bytes1, bytes32)',
  'event FheMul(bytes32, bytes32, bytes32, bytes1, bytes32)',
  'event FheDiv(bytes32, bytes32, bytes32, bytes1, bytes32)',
  'event FheRem(bytes32, bytes32, bytes32, bytes1, bytes32)',
  'event FheAnd(bytes32, bytes32, bytes32, bytes32)',
  'event FheOr(bytes32, bytes32, bytes32, bytes32)',
  'event FheXor(bytes32, bytes32, bytes32, bytes32)',
  'event FheShl(bytes32, bytes32, bytes32, bytes1, bytes32)',
  'event FheShr(bytes32, bytes32, bytes32, bytes1, bytes32)',
  'event FheEq(bytes32, bytes32, bytes32, bytes1, bytes32)',
  'event FheNe(bytes32, bytes32, bytes32, bytes1, bytes32)',
  'event FheGe(bytes32, bytes32, bytes32, bytes1, bytes32)',
  'event FheGt(bytes32, bytes32, bytes32, bytes1, bytes32)',
  'event FheLe(bytes32, bytes32, bytes32, bytes1, bytes32)',
  'event FheLt(bytes32, bytes32, bytes32, bytes1, bytes32)',
  'event FheMin(bytes32, bytes32, bytes32, bytes1, bytes32)',
  'event FheMax(bytes32, bytes32, bytes32, bytes1, bytes32)',
  'event Cast(bytes32, uint8, bytes32)',
  'event FheNot(bytes32, bytes32)',
  'event FheNeg(bytes32, bytes32)',
  'event FheIfThenElse(bytes32, bytes32, bytes32, bytes32)',
  'event FheRand(uint8, uint8, bytes32)',
  'event FheRandBounded(uint256, uint8, uint8, bytes32)',
  'event TrivialEncrypt(bytes32, uint8, bytes32)',
  'event Verify(bytes32, bytes, bytes32)',
];

const iface = new ethers.Interface(Abi);

let db: Database;

export function init() {
  db = new Database(':memory:');
  db.serialize(() => {
    db.run('CREATE TABLE handles (handle TEXT PRIMARY KEY, value TEXT, isUsed INTEGER)');
  });
}

export function close() {
  db.close();
}

export function insertSQL(handle: string, value: bigint, isUsed: boolean) {
  const stmt = db.prepare('INSERT OR REPLACE INTO handles (handle, value, isUsed) VALUES (?, ?, ?)');
  stmt.run(handle, value.toString(), isUsed);
  stmt.finalize();
}

export async function getClearText(handle: string): Promise<bigint> {
  return new Promise((resolve, reject) => {
    db.get('SELECT value FROM handles WHERE handle = ?', [handle], (err, row: any) => {
      if (err) {
        reject(err);
      } else {
        if (row) {
          resolve(BigInt(row.value));
        } else {
          resolve(BigInt(0));
        }
      }
    });
  });
}

export async function awaitCoprocessor(skip?: boolean): Promise<void> {
  if (skip) return;
  const filter = {
    address: coprocAddress,
  };
  const logs = await ethers.provider.getLogs(filter);
  for (const log of logs) {
    const event = iface.parseLog(log);
    if (!event) {
      throw new Error('Event is null');
    }
    switch (event.name) {
      case 'TrivialEncrypt':
        const handle = ethers.toBeHex(event.args[2], 32);
        const clearText = BigInt(event.args[0]);
        insertSQL(handle, clearText, true);
        break;
      case 'Verify':
        const resultHandle = ethers.toBeHex(event.args[2], 32);
        insertSQL(resultHandle, BigInt(1), true);
        break;
      case 'FheAdd':
        const resultAdd = await add(
          ethers.toBeHex(event.args[0], 32),
          ethers.toBeHex(event.args[1], 32),
          event.args[2],
        );
        insertSQL(ethers.toBeHex(event.args[3], 32), resultAdd, true);
        break;
      case 'FheSub':
        const resultSub = await sub(
          ethers.toBeHex(event.args[0], 32),
          ethers.toBeHex(event.args[1], 32),
          event.args[2],
        );
        insertSQL(ethers.toBeHex(event.args[3], 32), resultSub, true);
        break;
      case 'FheMul':
        const resultMul = await mul(
          ethers.toBeHex(event.args[0], 32),
          ethers.toBeHex(event.args[1], 32),
          event.args[2],
        );
        insertSQL(ethers.toBeHex(event.args[3], 32), resultMul, true);
        break;
      case 'FheDiv':
        const resultDiv = await div(
          ethers.toBeHex(event.args[0], 32),
          ethers.toBeHex(event.args[1], 32),
          event.args[2],
        );
        insertSQL(ethers.toBeHex(event.args[3], 32), resultDiv, true);
        break;
      case 'FheRem':
        const resultRem = await rem(
          ethers.toBeHex(event.args[0], 32),
          ethers.toBeHex(event.args[1], 32),
          event.args[2],
        );
        insertSQL(ethers.toBeHex(event.args[3], 32), resultRem, true);
        break;
      case 'FheAnd':
        const resultAnd = await and(ethers.toBeHex(event.args[0], 32), ethers.toBeHex(event.args[1], 32));
        insertSQL(ethers.toBeHex(event.args[2], 32), resultAnd, true);
        break;
      case 'FheOr':
        const resultOr = await or(ethers.toBeHex(event.args[0], 32), ethers.toBeHex(event.args[1], 32));
        insertSQL(ethers.toBeHex(event.args[2], 32), resultOr, true);
        break;
      case 'FheXor':
        const resultXor = await xor(ethers.toBeHex(event.args[0], 32), ethers.toBeHex(event.args[1], 32));
        insertSQL(ethers.toBeHex(event.args[2], 32), resultXor, true);
        break;
      case 'FheShl':
        const resultShl = await shl(
          ethers.toBeHex(event.args[0], 32),
          ethers.toBeHex(event.args[1], 32),
          event.args[2],
        );
        insertSQL(ethers.toBeHex(event.args[3], 32), resultShl, true);
        break;
      case 'FheShr':
        const resultShr = await shr(
          ethers.toBeHex(event.args[0], 32),
          ethers.toBeHex(event.args[1], 32),
          event.args[2],
        );
        insertSQL(ethers.toBeHex(event.args[3], 32), resultShr, true);
        break;
      case 'FheEq':
        const resultEq = await eq(
          ethers.toBeHex(event.args[0], 32),
          ethers.toBeHex(event.args[1], 32),
          event.args[2],
        );
        insertSQL(ethers.toBeHex(event.args[3], 32), resultEq, true);
        break;
      case 'FheNe':
        const resultNe = await ne(
          ethers.toBeHex(event.args[0], 32),
          ethers.toBeHex(event.args[1], 32),
          event.args[2],
        );
        insertSQL(ethers.toBeHex(event.args[3], 32), resultNe, true);
        break;
      case 'FheGe':
        const resultGe = await ge(
          ethers.toBeHex(event.args[0], 32),
          ethers.toBeHex(event.args[1], 32),
          event.args[2],
        );
        insertSQL(ethers.toBeHex(event.args[3], 32), resultGe, true);
        break;
      case 'FheGt':
        const resultGt = await gt(
          ethers.toBeHex(event.args[0], 32),
          ethers.toBeHex(event.args[1], 32),
          event.args[2],
        );
        insertSQL(ethers.toBeHex(event.args[3], 32), resultGt, true);
        break;
      case 'FheLe':
        const resultLe = await le(
          ethers.toBeHex(event.args[0], 32),
          ethers.toBeHex(event.args[1], 32),
          event.args[2],
        );
        insertSQL(ethers.toBeHex(event.args[3], 32), resultLe, true);
        break;
      case 'FheLt':
        const resultLt = await lt(
          ethers.toBeHex(event.args[0], 32),
          ethers.toBeHex(event.args[1], 32),
          event.args[2],
        );
        insertSQL(ethers.toBeHex(event.args[3], 32), resultLt, true);
        break;
      case 'FheMax':
        const resultMax = await max(
          ethers.toBeHex(event.args[0], 32),
          ethers.toBeHex(event.args[1], 32),
          event.args[2],
        );
        insertSQL(ethers.toBeHex(event.args[3], 32), resultMax, true);
        break;
      case 'FheMin':
        const resultMin = await min(
          ethers.toBeHex(event.args[0], 32),
          ethers.toBeHex(event.args[1], 32),
          event.args[2],
        );
        insertSQL(ethers.toBeHex(event.args[3], 32), resultMin, true);
        break;
      case 'Cast':
        const resultCast = await cast(ethers.toBeHex(event.args[0], 32), event.args[1]);
        insertSQL(ethers.toBeHex(event.args[2], 32), resultCast, true);
        break;
      case 'FheNot':
        const resultNot = await not(ethers.toBeHex(event.args[0], 32));
        insertSQL(ethers.toBeHex(event.args[1], 32), resultNot, true);
        break;
      case 'FheNeg':
        const resultNeg = await neg(ethers.toBeHex(event.args[0], 32));
        insertSQL(ethers.toBeHex(event.args[1], 32), resultNeg, true);
        break;
      case 'FheIfThenElse':
        const resultCMux = await cmux(
          ethers.toBeHex(event.args[0], 32),
          ethers.toBeHex(event.args[1], 32),
          ethers.toBeHex(event.args[2], 32),
        );
        insertSQL(ethers.toBeHex(event.args[3], 32), resultCMux, true);
        break;
      case 'FheRand':
        const resultType = parseInt(event.args[1]);
        const handleRand = ethers.toBeHex(event.args[2], 32);
        const clearTextRand = getRandomBigInt(Number(NumBits[resultType]));
        insertSQL(handleRand, clearTextRand, true);
        break;
      case 'FheRandBounded':
        const resultTypeBounded = parseInt(event.args[2]);
        const handleRandBounded = ethers.toBeHex(event.args[3], 32);
        const clearTextRandBounded = getRandomBigInt(Number(log2(BigInt(event.args[0]))));
        insertSQL(handleRandBounded, clearTextRandBounded, true);
        break;
    }
  }
}

const bits = (type: FheType) => {
  const fheType = ALL_FHE_TYPES.find((t) => t.name === type);
  if (!fheType) {
    throw new Error(`Invalid FheType: ${type}`);
  }
  return fheType.size;
};

const signed = (type: FheType) => {
  const fheType = ALL_FHE_TYPES.find((t) => t.name === type);
  if (!fheType) {
    throw new Error(`Invalid FheType: ${type}`);
  }
  return fheType.signed;
};

const add = async (a: string, b: string, scalar: string): Promise<bigint> => {
  const type = FheType[parseInt(a.slice(-2), 16)];
  const bit = bits(type);
  const valA = await getClearText(a);
  let valB;
  if (scalar === '0x01') {
    valB = BigInt(b);
  } else {
    valB = await getClearText(b);
  }
  return (valA + valB) & ((1n << BigInt(bit)) - 1n);
};

const sub = async (a: string, b: string, scalar: string): Promise<bigint> => {
  const type = FheType[parseInt(a.slice(-2), 16)];
  const bit = bits(type);
  const valA = await getClearText(a);
  let valB;
  if (scalar === '0x01') {
    valB = BigInt(b);
  } else {
    valB = await getClearText(b);
  }
  return (valA - valB) & ((1n << BigInt(bit)) - 1n);
};

const mul = async (a: string, b: string, scalar: string): Promise<bigint> => {
  const type = FheType[parseInt(a.slice(-2), 16)];
  const bit = bits(type);
  const valA = await getClearText(a);
  let valB;
  if (scalar === '0x01') {
    valB = BigInt(b);
  } else {
    valB = await getClearText(b);
  }
  return (valA * valB) & ((1n << BigInt(bit)) - 1n);
};

const div = async (a: string, b: string, scalar: string): Promise<bigint> => {
  const valA = await getClearText(a);
  let valB;
  if (scalar === '0x01') {
    valB = BigInt(b);
  } else {
    valB = await getClearText(b);
  }
  return valA / valB;
};

const rem = async (a: string, b: string, scalar: string): Promise<bigint> => {
  const valA = await getClearText(a);
  let valB;
  if (scalar === '0x01') {
    valB = BigInt(b);
  } else {
    valB = await getClearText(b);
  }
  return valA % valB;
};

const and = async (a: string, b: string): Promise<bigint> => {
  const valA = await getClearText(a);
  const valB = await getClearText(b);
  return valA & valB;
};

const or = async (a: string, b: string): Promise<bigint> => {
  const valA = await getClearText(a);
  const valB = await getClearText(b);
  return valA | valB;
};

const xor = async (a: string, b: string): Promise<bigint> => {
  const valA = await getClearText(a);
  const valB = await getClearText(b);
  return valA ^ valB;
};

const shl = async (a: string, b: string, scalar: string): Promise<bigint> => {
  const type = FheType[parseInt(a.slice(-2), 16)];
  const bit = bits(type);
  const valA = await getClearText(a);
  let valB;
  if (scalar === '0x01') {
    valB = BigInt(b);
  } else {
    valB = await getClearText(b);
  }
  return (valA << valB) & ((1n << BigInt(bit)) - 1n);
};

const shr = async (a: string, b: string, scalar: string): Promise<bigint> => {
  const valA = await getClearText(a);
  let valB;
  if (scalar === '0x01') {
    valB = BigInt(b);
  } else {
    valB = await getClearText(b);
  }
  return valA >> valB;
};

const eq = async (a: string, b: string, scalar: string): Promise<bigint> => {
  const valA = await getClearText(a);
  let valB;
  if (scalar === '0x01') {
    valB = BigInt(b);
  } else {
    valB = await getClearText(b);
  }
  return valA === valB ? 1n : 0n;
};

const ne = async (a: string, b: string, scalar: string): Promise<bigint> => {
  const valA = await getClearText(a);
  let valB;
  if (scalar === '0x01') {
    valB = BigInt(b);
  } else {
    valB = await getClearText(b);
  }
  return valA !== valB ? 1n : 0n;
};

const ge = async (a: string, b: string, scalar: string): Promise<bigint> => {
  const type = FheType[parseInt(a.slice(-2), 16)];
  const bit = bits(type);
  const sign = signed(type);
  let valA = await getClearText(a);
  let valB;
  if (scalar === '0x01') {
    valB = BigInt(b);
  } else {
    valB = await getClearText(b);
  }
  if (sign) {
    valA = toSigned(valA, bit);
    valB = toSigned(valB, bit);
  }
  return valA >= valB ? 1n : 0n;
};

const gt = async (a: string, b: string, scalar: string): Promise<bigint> => {
  const type = FheType[parseInt(a.slice(-2), 16)];
  const bit = bits(type);
  const sign = signed(type);
  let valA = await getClearText(a);
  let valB;
  if (scalar === '0x01') {
    valB = BigInt(b);
  } else {
    valB = await getClearText(b);
  }
  if (sign) {
    valA = toSigned(valA, bit);
    valB = toSigned(valB, bit);
  }
  return valA > valB ? 1n : 0n;
};

const le = async (a: string, b: string, scalar: string): Promise<bigint> => {
  const type = FheType[parseInt(a.slice(-2), 16)];
  const bit = bits(type);
  const sign = signed(type);
  let valA = await getClearText(a);
  let valB;
  if (scalar === '0x01') {
    valB = BigInt(b);
  } else {
    valB = await getClearText(b);
  }
  if (sign) {
    valA = toSigned(valA, bit);
    valB = toSigned(valB, bit);
  }
  return valA <= valB ? 1n : 0n;
};

const lt = async (a: string, b: string, scalar: string): Promise<bigint> => {
  const type = FheType[parseInt(a.slice(-2), 16)];
  const bit = bits(type);
  const sign = signed(type);
  let valA = await getClearText(a);
  let valB;
  if (scalar === '0x01') {
    valB = BigInt(b);
  } else {
    valB = await getClearText(b);
  }
  if (sign) {
    valA = toSigned(valA, bit);
    valB = toSigned(valB, bit);
  }
  return valA < valB ? 1n : 0n;
};

const max = async (a: string, b: string, scalar: string): Promise<bigint> => {
  const type = FheType[parseInt(a.slice(-2), 16)];
  const bit = bits(type);
  const sign = signed(type);
  let valA = await getClearText(a);
  let valB;
  if (scalar === '0x01') {
    valB = BigInt(b);
  } else {
    valB = await getClearText(b);
  }
  if (sign) {
    valA = toSigned(valA, bit);
    valB = toSigned(valB, bit);
  }
  return valA > valB ? valA : valB;
};

const min = async (a: string, b: string, scalar: string): Promise<bigint> => {
  const type = FheType[parseInt(a.slice(-2), 16)];
  const bit = bits(type);
  const sign = signed(type);
  let valA = await getClearText(a);
  let valB;
  if (scalar === '0x01') {
    valB = BigInt(b);
  } else {
    valB = await getClearText(b);
  }
  if (sign) {
    valA = toSigned(valA, bit);
    valB = toSigned(valB, bit);
  }
  return valA < valB ? valA : valB;
};

const cast = async (a: string, to: number): Promise<bigint> => {
  const type = FheType[to];
  const bit = bits(type);
  const valA = await getClearText(a);
  return valA & ((1n << BigInt(bit)) - 1n);
};

const not = async (a: string): Promise<bigint> => {
  const type = FheType[parseInt(a.slice(-2), 16)];
  const bit = bits(type);
  const valA = await getClearText(a);
  return ~valA & ((1n << BigInt(bit)) - 1n);
};

const neg = async (a: string): Promise<bigint> => {
  const type = FheType[parseInt(a.slice(-2), 16)];
  const bit = bits(type);
  const valA = await getClearText(a);
  return -valA & ((1n << BigInt(bit)) - 1n);
};

const cmux = async (c: string, a: string, b: string): Promise<bigint> => {
  const valC = await getClearText(c);
  const valA = await getClearText(a);
  const valB = await getClearText(b);
  return valC === 1n ? valA : valB;
};

const toSigned = (val: bigint, bit: number): bigint => {
  const sign = val >> (BigInt(bit) - 1n);
  if (sign === 1n) {
    return val - (1n << BigInt(bit));
  }
  return val;
};

const log2 = (n: bigint): bigint => {
  if (n <= 0) {
    throw new Error('Input must be positive');
  }
  let res = 0;
  while (n > 1) {
    n >>= 1n;
    res++;
  }
  return BigInt(res);
};

const getRandomBigInt = (bits: number) => {
  const bytes = Math.ceil(bits / 8);
  let randomHex = '0x';
  for (let i = 0; i < bytes; i++) {
    randomHex += Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0');
  }
  let randomBigInt = BigInt(randomHex);
  const mask = (1n << BigInt(bits)) - 1n;
  randomBigInt &= mask;
  return randomBigInt;
};

const NumBits: { [key: number]: number } = {
  0: 1,
  1: 4,
  2: 8,
  3: 16,
  4: 32,
  5: 64,
  6: 128,
  7: 160,
  8: 256,
};

export async function estimateHCUs(tx: any): Promise<{
  globalTxHCU: number;
  maxTxHCUDepth: number;
  HCUDepthPerHandle: Record<string, number>;
}> {
  const receipt = await tx.wait();
  const logs = receipt.logs;
  const handleSet = new Set<string>();
  const hcuMap: Record<string, number> = {};
  let totalHCUConsumed = 0;
  let counterRand = 0;

  const readFromHCUMap = (key: string): number => {
    return hcuMap[key] || 0;
  };

  for (const log of logs) {
    const event = iface.parseLog(log);
    if (!event) {
      continue;
    }

    let handleResult: string;
    let handle: string;
    let typeIndex: number;
    let type: FheType | undefined;
    let hcuConsumed: number;
    let resultType: number;
    let clearText: bigint;

    switch (event.name) {
      case 'TrivialEncrypt':
        handleResult = ethers.toBeHex(event.args[2], 32);
        hcuMap[handleResult] = 0;
        handleSet.add(handleResult);
        break;

      case 'Verify':
        handleResult = ethers.toBeHex(event.args[2], 32);
        hcuMap[handleResult] = 0;
        handleSet.add(handleResult);
        break;

      case 'FheAdd':
        handleResult = ethers.toBeHex(event.args[4], 32);
        handle = ethers.toBeHex(event.args[1], 32);
        typeIndex = parseInt(handle.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;
        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }
        if (event.args[3] === '0x01') {
          hcuConsumed = (operatorsPrices['fheAdd'].scalar as Record<string, number>)[type];
          hcuMap[handleResult] = hcuConsumed + readFromHCUMap(ethers.toBeHex(event.args[1], 32));
        } else {
          hcuConsumed = (operatorsPrices['fheAdd'].nonScalar as Record<string, number>)[type];
          hcuMap[handleResult] =
            hcuConsumed +
            Math.max(
              readFromHCUMap(ethers.toBeHex(event.args[1], 32)),
              readFromHCUMap(ethers.toBeHex(event.args[2], 32)),
            );
        }
        handleSet.add(handleResult);
        totalHCUConsumed += hcuConsumed;
        break;

      case 'FheSub':
        handleResult = ethers.toBeHex(event.args[4], 32);
        handle = ethers.toBeHex(event.args[1], 32);
        typeIndex = parseInt(handle.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;
        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }
        if (event.args[3] === '0x01') {
          hcuConsumed = (operatorsPrices['fheSub'].scalar as Record<string, number>)[type];
          hcuMap[handleResult] = hcuConsumed + readFromHCUMap(ethers.toBeHex(event.args[1], 32));
        } else {
          hcuConsumed = (operatorsPrices['fheSub'].nonScalar as Record<string, number>)[type];
          hcuMap[handleResult] =
            hcuConsumed +
            Math.max(
              readFromHCUMap(ethers.toBeHex(event.args[1], 32)),
              readFromHCUMap(ethers.toBeHex(event.args[2], 32)),
            );
        }
        handleSet.add(handleResult);
        totalHCUConsumed += hcuConsumed;
        break;

      case 'FheMul':
        handleResult = ethers.toBeHex(event.args[4], 32);
        handle = ethers.toBeHex(event.args[1], 32);
        typeIndex = parseInt(handle.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;
        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }
        if (event.args[3] === '0x01') {
          hcuConsumed = (operatorsPrices['fheMul'].scalar as Record<string, number>)[type];
          hcuMap[handleResult] = hcuConsumed + readFromHCUMap(ethers.toBeHex(event.args[1], 32));
        } else {
          hcuConsumed = (operatorsPrices['fheMul'].nonScalar as Record<string, number>)[type];
          hcuMap[handleResult] =
            hcuConsumed +
            Math.max(
              readFromHCUMap(ethers.toBeHex(event.args[1], 32)),
              readFromHCUMap(ethers.toBeHex(event.args[2], 32)),
            );
        }
        handleSet.add(handleResult);
        totalHCUConsumed += hcuConsumed;
        break;

      case 'FheDiv':
        handleResult = ethers.toBeHex(event.args[4], 32);
        handle = ethers.toBeHex(event.args[1], 32);
        typeIndex = parseInt(handle.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;
        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }
        if (event.args[3] === '0x01') {
          hcuConsumed = (operatorsPrices['fheDiv'].scalar as Record<string, number>)[type];
          hcuMap[handleResult] = hcuConsumed + readFromHCUMap(ethers.toBeHex(event.args[1], 32));
        } else {
          hcuConsumed = (operatorsPrices['fheDiv'].nonScalar as Record<string, number>)[type];
          hcuMap[handleResult] =
            hcuConsumed +
            Math.max(
              readFromHCUMap(ethers.toBeHex(event.args[1], 32)),
              readFromHCUMap(ethers.toBeHex(event.args[2], 32)),
            );
        }
        handleSet.add(handleResult);
        totalHCUConsumed += hcuConsumed;
        break;

      case 'FheRem':
        handleResult = ethers.toBeHex(event.args[4], 32);
        handle = ethers.toBeHex(event.args[1], 32);
        typeIndex = parseInt(handle.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;
        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }
        if (event.args[3] === '0x01') {
          hcuConsumed = (operatorsPrices['fheRem'].scalar as Record<string, number>)[type];
          hcuMap[handleResult] = hcuConsumed + readFromHCUMap(ethers.toBeHex(event.args[1], 32));
        } else {
          hcuConsumed = (operatorsPrices['fheRem'].nonScalar as Record<string, number>)[type];
          hcuMap[handleResult] =
            hcuConsumed +
            Math.max(
              readFromHCUMap(ethers.toBeHex(event.args[1], 32)),
              readFromHCUMap(ethers.toBeHex(event.args[2], 32)),
            );
        }
        handleSet.add(handleResult);
        totalHCUConsumed += hcuConsumed;
        break;

      case 'FheAnd':
        handleResult = ethers.toBeHex(event.args[3], 32);
        handle = ethers.toBeHex(event.args[1], 32);
        typeIndex = parseInt(handle.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;
        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }
        hcuConsumed = (operatorsPrices['fheAnd'].types as Record<string, number>)[type];
        hcuMap[handleResult] =
          hcuConsumed +
          Math.max(
            readFromHCUMap(ethers.toBeHex(event.args[1], 32)),
            readFromHCUMap(ethers.toBeHex(event.args[2], 32)),
          );
        handleSet.add(handleResult);
        totalHCUConsumed += hcuConsumed;
        break;

      case 'FheOr':
        handleResult = ethers.toBeHex(event.args[3], 32);
        handle = ethers.toBeHex(event.args[1], 32);
        typeIndex = parseInt(handle.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;
        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }
        hcuConsumed = (operatorsPrices['fheOr'].types as Record<string, number>)[type];
        hcuMap[handleResult] =
          hcuConsumed +
          Math.max(
            readFromHCUMap(ethers.toBeHex(event.args[1], 32)),
            readFromHCUMap(ethers.toBeHex(event.args[2], 32)),
          );
        handleSet.add(handleResult);
        totalHCUConsumed += hcuConsumed;
        break;

      case 'FheXor':
        handleResult = ethers.toBeHex(event.args[3], 32);
        handle = ethers.toBeHex(event.args[1], 32);
        typeIndex = parseInt(handle.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;
        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }
        hcuConsumed = (operatorsPrices['fheXor'].types as Record<string, number>)[type];
        hcuMap[handleResult] =
          hcuConsumed +
          Math.max(
            readFromHCUMap(ethers.toBeHex(event.args[1], 32)),
            readFromHCUMap(ethers.toBeHex(event.args[2], 32)),
          );
        handleSet.add(handleResult);
        totalHCUConsumed += hcuConsumed;
        break;

      case 'FheShl':
        handleResult = ethers.toBeHex(event.args[4], 32);
        handle = ethers.toBeHex(event.args[1], 32);
        typeIndex = parseInt(handle.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;
        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }
        if (event.args[3] === '0x01') {
          hcuConsumed = (operatorsPrices['fheShl'].scalar as Record<string, number>)[type];
          hcuMap[handleResult] = hcuConsumed + readFromHCUMap(ethers.toBeHex(event.args[1], 32));
        } else {
          hcuConsumed = (operatorsPrices['fheShl'].nonScalar as Record<string, number>)[type];
          hcuMap[handleResult] =
            hcuConsumed +
            Math.max(
              readFromHCUMap(ethers.toBeHex(event.args[1], 32)),
              readFromHCUMap(ethers.toBeHex(event.args[2], 32)),
            );
        }
        handleSet.add(handleResult);
        totalHCUConsumed += hcuConsumed;
        break;

      case 'FheShr':
        handleResult = ethers.toBeHex(event.args[4], 32);
        handle = ethers.toBeHex(event.args[1], 32);
        typeIndex = parseInt(handle.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;
        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }
        if (event.args[3] === '0x01') {
          hcuConsumed = (operatorsPrices['fheShr'].scalar as Record<string, number>)[type];
          hcuMap[handleResult] = hcuConsumed + readFromHCUMap(ethers.toBeHex(event.args[1], 32));
        } else {
          hcuConsumed = (operatorsPrices['fheShr'].nonScalar as Record<string, number>)[type];
          hcuMap[handleResult] =
            hcuConsumed +
            Math.max(
              readFromHCUMap(ethers.toBeHex(event.args[1], 32)),
              readFromHCUMap(ethers.toBeHex(event.args[2], 32)),
            );
        }
        handleSet.add(handleResult);
        totalHCUConsumed += hcuConsumed;
        break;

      case 'FheEq':
        handleResult = ethers.toBeHex(event.args[4], 32);
        handle = ethers.toBeHex(event.args[1], 32);
        typeIndex = parseInt(handle.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;
        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }
        if (event.args[3] === '0x01') {
          hcuConsumed = (operatorsPrices['fheEq'].scalar as Record<string, number>)[type];
          hcuMap[handleResult] = hcuConsumed + readFromHCUMap(ethers.toBeHex(event.args[1], 32));
        } else {
          hcuConsumed = (operatorsPrices['fheEq'].nonScalar as Record<string, number>)[type];
          hcuMap[handleResult] =
            hcuConsumed +
            Math.max(
              readFromHCUMap(ethers.toBeHex(event.args[1], 32)),
              readFromHCUMap(ethers.toBeHex(event.args[2], 32)),
            );
        }
        handleSet.add(handleResult);
        totalHCUConsumed += hcuConsumed;
        break;

      case 'FheNe':
        handleResult = ethers.toBeHex(event.args[4], 32);
        handle = ethers.toBeHex(event.args[1], 32);
        typeIndex = parseInt(handle.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;
        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }
        if (event.args[3] === '0x01') {
          hcuConsumed = (operatorsPrices['fheNe'].scalar as Record<string, number>)[type];
          hcuMap[handleResult] = hcuConsumed + readFromHCUMap(ethers.toBeHex(event.args[1], 32));
        } else {
          hcuConsumed = (operatorsPrices['fheNe'].nonScalar as Record<string, number>)[type];
          hcuMap[handleResult] =
            hcuConsumed +
            Math.max(
              readFromHCUMap(ethers.toBeHex(event.args[1], 32)),
              readFromHCUMap(ethers.toBeHex(event.args[2], 32)),
            );
        }
        handleSet.add(handleResult);
        totalHCUConsumed += hcuConsumed;
        break;

      case 'FheGe':
        handleResult = ethers.toBeHex(event.args[4], 32);
        handle = ethers.toBeHex(event.args[1], 32);
        typeIndex = parseInt(handle.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;
        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }
        if (event.args[3] === '0x01') {
          hcuConsumed = (operatorsPrices['fheGe'].scalar as Record<string, number>)[type];
          hcuMap[handleResult] = hcuConsumed + readFromHCUMap(ethers.toBeHex(event.args[1], 32));
        } else {
          hcuConsumed = (operatorsPrices['fheGe'].nonScalar as Record<string, number>)[type];
          hcuMap[handleResult] =
            hcuConsumed +
            Math.max(
              readFromHCUMap(ethers.toBeHex(event.args[1], 32)),
              readFromHCUMap(ethers.toBeHex(event.args[2], 32)),
            );
        }
        handleSet.add(handleResult);
        totalHCUConsumed += hcuConsumed;
        break;

      case 'FheGt':
        handleResult = ethers.toBeHex(event.args[4], 32);
        handle = ethers.toBeHex(event.args[1], 32);
        typeIndex = parseInt(handle.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;
        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }
        if (event.args[3] === '0x01') {
          hcuConsumed = (operatorsPrices['fheGt'].scalar as Record<string, number>)[type];
          hcuMap[handleResult] = hcuConsumed + readFromHCUMap(ethers.toBeHex(event.args[1], 32));
        } else {
          hcuConsumed = (operatorsPrices['fheGt'].nonScalar as Record<string, number>)[type];
          hcuMap[handleResult] =
            hcuConsumed +
            Math.max(
              readFromHCUMap(ethers.toBeHex(event.args[1], 32)),
              readFromHCUMap(ethers.toBeHex(event.args[2], 32)),
            );
        }
        handleSet.add(handleResult);
        totalHCUConsumed += hcuConsumed;
        break;

      case 'FheLe':
        handleResult = ethers.toBeHex(event.args[4], 32);
        handle = ethers.toBeHex(event.args[1], 32);
        typeIndex = parseInt(handle.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;
        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }
        if (event.args[3] === '0x01') {
          hcuConsumed = (operatorsPrices['fheLe'].scalar as Record<string, number>)[type];
          hcuMap[handleResult] = hcuConsumed + readFromHCUMap(ethers.toBeHex(event.args[1], 32));
        } else {
          hcuConsumed = (operatorsPrices['fheLe'].nonScalar as Record<string, number>)[type];
          hcuMap[handleResult] =
            hcuConsumed +
            Math.max(
              readFromHCUMap(ethers.toBeHex(event.args[1], 32)),
              readFromHCUMap(ethers.toBeHex(event.args[2], 32)),
            );
        }
        handleSet.add(handleResult);
        totalHCUConsumed += hcuConsumed;
        break;

      case 'FheLt':
        handleResult = ethers.toBeHex(event.args[4], 32);
        handle = ethers.toBeHex(event.args[1], 32);
        typeIndex = parseInt(handle.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;
        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }
        if (event.args[3] === '0x01') {
          hcuConsumed = (operatorsPrices['fheLt'].scalar as Record<string, number>)[type];
          hcuMap[handleResult] = hcuConsumed + readFromHCUMap(ethers.toBeHex(event.args[1], 32));
        } else {
          hcuConsumed = (operatorsPrices['fheLt'].nonScalar as Record<string, number>)[type];
          hcuMap[handleResult] =
            hcuConsumed +
            Math.max(
              readFromHCUMap(ethers.toBeHex(event.args[1], 32)),
              readFromHCUMap(ethers.toBeHex(event.args[2], 32)),
            );
        }
        handleSet.add(handleResult);
        totalHCUConsumed += hcuConsumed;
        break;

      case 'FheMax':
        handleResult = ethers.toBeHex(event.args[4], 32);
        typeIndex = parseInt(handleResult.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;

        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }

        if (event.args[3] === '0x01') {
          hcuConsumed = (operatorsPrices['fheMax'].scalar as Record<string, number>)[type];
          hcuMap[handleResult] = hcuConsumed + readFromHCUMap(ethers.toBeHex(event.args[1], 32));
        } else {
          hcuConsumed = (operatorsPrices['fheMax'].nonScalar as Record<string, number>)[type];
          hcuMap[handleResult] =
            hcuConsumed +
            Math.max(
              readFromHCUMap(ethers.toBeHex(event.args[1], 32)),
              readFromHCUMap(ethers.toBeHex(event.args[2], 32)),
            );
        }

        handleSet.add(handleResult);
        totalHCUConsumed += hcuConsumed;
        break;

      case 'FheMin':
        handleResult = ethers.toBeHex(event.args[4], 32);
        typeIndex = parseInt(handleResult.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;

        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }

        if (event.args[3] === '0x01') {
          hcuConsumed = (operatorsPrices['fheMin'].scalar as Record<string, number>)[type];
          hcuMap[handleResult] = hcuConsumed + readFromHCUMap(ethers.toBeHex(event.args[1], 32));
        } else {
          hcuConsumed = (operatorsPrices['fheMin'].nonScalar as Record<string, number>)[type];
          hcuMap[handleResult] =
            hcuConsumed +
            Math.max(
              readFromHCUMap(ethers.toBeHex(event.args[1], 32)),
              readFromHCUMap(ethers.toBeHex(event.args[2], 32)),
            );
        }

        handleSet.add(handleResult);
        totalHCUConsumed += hcuConsumed;
        break;

      case 'Cast':
        handle = ethers.toBeHex(event.args[1], 32);
        typeIndex = parseInt(handle.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;
        handleResult = ethers.toBeHex(event.args[3], 32);

        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }

        hcuConsumed = (operatorsPrices['cast'].types as Record<string, number>)[type];
        hcuMap[handleResult] = hcuConsumed + readFromHCUMap(handle);
        totalHCUConsumed += hcuConsumed;
        handleSet.add(handleResult);
        break;

      case 'FheNot':
        handle = ethers.toBeHex(event.args[1], 32);
        typeIndex = parseInt(handle.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;
        handleResult = ethers.toBeHex(event.args[2], 32);
        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }
        hcuConsumed = (operatorsPrices['fheNot'].types as Record<string, number>)[type];
        hcuMap[handleResult] = hcuConsumed + readFromHCUMap(handle);
        totalHCUConsumed += hcuConsumed;
        handleSet.add(ethers.toBeHex(event.args[2], 32));
        break;

      case 'FheNeg':
        handle = ethers.toBeHex(event.args[1], 32);
        typeIndex = parseInt(handle.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;
        handleResult = ethers.toBeHex(event.args[2], 32);
        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }
        hcuConsumed = (operatorsPrices['fheNeg'].types as Record<string, number>)[type];
        hcuMap[handleResult] = hcuConsumed + readFromHCUMap(handle);
        totalHCUConsumed += hcuConsumed;
        handleSet.add(ethers.toBeHex(event.args[2], 32));
        break;

      case 'FheIfThenElse':
        handleResult = ethers.toBeHex(event.args[4], 32);
        typeIndex = parseInt(handleResult.slice(-4, -2), 16);
        type = FheTypes.find((t) => t.value === typeIndex)?.type;

        if (!type) {
          throw new Error(`Invalid FheType index: ${typeIndex}`);
        }

        hcuConsumed = (operatorsPrices['ifThenElse'].types as Record<string, number>)[type];
        hcuMap[handleResult] =
          hcuConsumed +
          Math.max(
            readFromHCUMap(ethers.toBeHex(event.args[1], 32)),
            readFromHCUMap(ethers.toBeHex(event.args[2], 32)),
            readFromHCUMap(ethers.toBeHex(event.args[3], 32)),
          );
        handleSet.add(handleResult);
        totalHCUConsumed += hcuConsumed;
        break;

      case 'FheRand':
        resultType = parseInt(event.args[1]);
        handle = ethers.toBeHex(event.args[3], 32);
        clearText = getRandomBigInt(Number(NumBits[resultType]));
        insertSQL(handle, clearText, true);
        counterRand++;
        break;

      case 'FheRandBounded':
        resultType = parseInt(event.args[2]);
        handle = ethers.toBeHex(event.args[4], 32);
        clearText = getRandomBigInt(Number(log2(BigInt(event.args[1]))));
        insertSQL(handle, clearText, true);
        counterRand++;
        break;
    }
  }

  let maxDepthHCU = 0;

  handleSet.forEach((handle) => {
    const hcu = hcuMap[handle];
    if (hcu > maxDepthHCU) {
      maxDepthHCU = hcu;
    }
  });

  return {
    globalTxHCU: totalHCUConsumed,
    maxTxHCUDepth: maxDepthHCU,
    HCUDepthPerHandle: hcuMap,
  };
}