const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');

const provider = ganache.provider();
const web3 = new Web3(provider);

const { interface, bytecode } = require('../compile');

let lotto;
let accounts;

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();
  lotto = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({ data: bytecode })
    .send({ from: accounts[0], gas: '1000000' });
});

describe('Lotto Contract', () => {
  it('deploys a contract', () => {
    assert.ok(lotto.options.address);
  });

  it('allows one account to enter', async () => {
    await lotto.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('0.02', 'ether')
    });

    const players = await lotto.methods.getPlayer().call({
      from: accounts[0]
    });

    assert.equal(accounts[0], players[0]); // 올바른 주소가 저장됐는지 확인하는 테스트
    assert.equal(1, players.length); // 1개의 레코드만 있는지 확인하는 테스트
  });

  it('allows multiple accounts to enter', async () => {
    await lotto.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('0.02', 'ether')
    });

    await lotto.methods.enter().send({
      from: accounts[1],
      value: web3.utils.toWei('0.02', 'ether')
    });

    await lotto.methods.enter().send({
      from: accounts[2],
      value: web3.utils.toWei('0.02', 'ether')
    });

    const players = await lotto.methods.getPlayer().call({
      from: accounts[0]
    });

    assert.equal(accounts[0], players[0]); // 올바른 주소가 저장됐는지 확인하는 테스트
    assert.equal(accounts[1], players[1]);
    assert.equal(accounts[2], players[2]);
    assert.equal(3, players.length); // 3개의 레코드가 있는지 확인하는 테스트
  });

  it('requires a minimum amount of ether to enter', async () => {
    try {
      await lotto.methods.enter().send({
        from: accounts[0],
        value: 0 // 200 wei
      });
      assert(false);
    } catch (e) {
      assert.ok(e);
    }
  });

  it('only manager can call pickWinner', async () => {
    try {
      await lotto.methods.pickWinner().send({
        from: accounts[1]
      });
      assert(false); // ?
    } catch (e) {
      assert(e);
    }
  });

  it('send money to the winner and resets the player array', async () => {
    await lotto.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('2', 'ether')
    });

    const initialBalance = await web3.eth.getBalance(accounts[0]);
    await lotto.methods.pickWinner().send({ from: accounts[0] });
    const finalBalance = await web3.eth.getBalance(accounts[0]);
    const difference = finalBalance - initialBalance;
    
    assert(difference > web3.utils.toWei('1.8', 'ether'));
  });
});
