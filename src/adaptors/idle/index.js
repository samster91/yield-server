const utils = require('../utils');
const BN = require('bignumber.js');
const superagent = require('superagent');

const endpoint = 'https://api-v2.idle.finance/v1/'

const AUTH_TOKEN_ENCODED = 'ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SjFjMlZ5U1dRaU9pSTJOalJrWVRaak9ETTNOVEl4TURCaU5tTTNOakkyWW1FaUxDSjBiMnRsYmtsa0lqb2lOalk0Wm1JNFltWm1OamRsTldFM01XUmpaVEZsTnpWa0lpd2lhV0YwSWpveE56SXdOamswT1RjMWZRLlBzLU13RGZZSDNlZGl0QnhPLUJJQlFZXzJ5ckJZcGQ3M0QySTZBZFZ1SGc=';

async function getDataWithAuth(url, token) {
  const data = await superagent
    .get(url)
    .set('Authorization', `Bearer ${token}`);
  return data?.body;
}

const getApy = async () => {
  const AUTH_TOKEN_DECODED = atob(AUTH_TOKEN_ENCODED);
  const [
    vaults,
    chains,
    tokens,
    vaultBlocks
  ] = await Promise.all([
    getDataWithAuth(`${endpoint}vaults`, AUTH_TOKEN_DECODED),
    getDataWithAuth(`${endpoint}chains`, AUTH_TOKEN_DECODED),
    getDataWithAuth(`${endpoint}tokens`, AUTH_TOKEN_DECODED),
    getDataWithAuth(`${endpoint}vault-latest-blocks`, AUTH_TOKEN_DECODED)
  ])

  // console.log('chains', chains.data)

  const output = []
  for await (v of vaults.data){
    const apyReward = Number(0);
    const rewardTokens = v.rewardTokens || [];
  
    const chain = chains.data.find( c => c._id === v.chainId )
    const token = tokens.data.find( t => t._id === v.tokenId )
    const vaultBlock = vaultBlocks.data.find( b => b.vaultId === v._id )

    let apyBase = 0
    const APR = vaultBlock.APRs.find( apr => apr.type === 'BASE' || apr.type === 'GROSS' )
    if (!APR || APR.rate <= 0){
      const vaultPerformance = await getDataWithAuth(`${endpoint}vault-performances?vaultBlockId=${vaultBlock._id}`, AUTH_TOKEN_DECODED)
      if (vaultPerformance.data?.length){
        apyBase = Number(vaultPerformance.data[0].realizedAPY)
      }
    } else if (APR) {
      apyBase = Number(APR.rate)
    }

    const tvlUsd = Number(BN(vaultBlock.TVL.USD).div(1e06).toFixed(6))
  
    output.push({
      pool: v.address,
      apyBase,
      apyReward,
      rewardTokens,
      symbol: token.symbol,
      poolMeta: v.name,
      tvlUsd,
      project: 'idle',
      chain: chain.name,
      underlyingTokens: [token.address],
    });
  }

  return output
};

module.exports = {
  timetravel: false,
  apy: getApy,
  url: 'https://app.idle.finance/',
};
