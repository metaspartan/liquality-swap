/* global web3, localStorage */

import Client from '@liquality/client'
import BitcoinEsploraApiProvider from '@liquality/bitcoin-esplora-api-provider'
import BitcoinEsploraSwapFindProvider from '@liquality/bitcoin-esplora-swap-find-provider'
import BitcoinRpcProvider from '@liquality/bitcoin-rpc-provider'
import BitcoinLedgerProvider from '@liquality/bitcoin-ledger-provider'
import BitcoinSwapProvider from '@liquality/bitcoin-swap-provider'
import BitcoinNodeWalletProvider from '@liquality/bitcoin-node-wallet-provider'
import BitcoinNetworks from '@liquality/bitcoin-networks'

import EthereumRpcProvider from '@liquality/ethereum-rpc-provider'
import EthereumLedgerProvider from '@liquality/ethereum-ledger-provider'
import EthereumNetworks from '@liquality/ethereum-networks'
import EthereumSwapProvider from '@liquality/ethereum-swap-provider'
import EthereumBlockscoutSwapFindProvider from '@liquality/ethereum-blockscout-swap-find-provider'
import EthereumScraperSwapFindProvider from '@liquality/ethereum-scraper-swap-find-provider'
import EthereumErc20Provider from '@liquality/ethereum-erc20-provider'
import EthereumErc20SwapProvider from '@liquality/ethereum-erc20-swap-provider'
import EthereumErc20ScraperSwapFindProvider from '@liquality/ethereum-erc20-scraper-swap-find-provider'
import EthereumMetaMaskProvider from '@liquality/ethereum-metamask-provider'

import config from '../config'

function getBitcoinDataProvider (btcConfig) {
  if (btcConfig.api) {
    return new BitcoinEsploraApiProvider(btcConfig.api.url, btcConfig.feeNumberOfBlocks)
  } else if (btcConfig.rpc) {
    return new BitcoinRpcProvider(btcConfig.rpc.url, btcConfig.rpc.username, btcConfig.rpc.password, btcConfig.feeNumberOfBlocks)
  }
}

function createBtcClient (asset, wallet) {
  const btcConfig = config.assets.btc

  const btcClient = new Client()
  if (wallet && wallet.includes('bitcoin_ledger')) {
    let addressType
    if (wallet === 'bitcoin_ledger_legacy') {
      addressType = 'legacy'
    } else if (wallet === 'bitcoin_ledger_nagive_segwit') {
      addressType = 'bech32'
    }
    const ledger = new BitcoinLedgerProvider({network: BitcoinNetworks[btcConfig.network]}, addressType)

    if (window.useWebBle || localStorage.useWebBle) {
      ledger.useWebBle()
    }
    btcClient.addProvider(getBitcoinDataProvider(btcConfig))
    btcClient.addProvider(ledger)
    btcClient.addProvider(new BitcoinSwapProvider({network: BitcoinNetworks[btcConfig.network]}, btcConfig.swapMode))
  } else if (wallet === 'bitcoin_node') {
    if (btcConfig.rpc.addressType === 'p2sh-segwit') {
      throw new Error('Wrapped segwit addresses (p2sh-segwit) are currently unsupported.')
    }
    if (btcConfig.api) btcClient.addProvider(new BitcoinEsploraApiProvider(btcConfig.api.url, btcConfig.feeNumberOfBlocks))
    btcClient.addProvider(new BitcoinRpcProvider(btcConfig.rpc.url, btcConfig.rpc.username, btcConfig.rpc.password, btcConfig.feeNumberOfBlocks))
    btcClient.addProvider(new BitcoinNodeWalletProvider(BitcoinNetworks[btcConfig.network], btcConfig.rpc.url, btcConfig.rpc.username, btcConfig.rpc.password, btcConfig.rpc.addressType))
    btcClient.addProvider(new BitcoinSwapProvider({network: BitcoinNetworks[btcConfig.network]}, btcConfig.swapMode))
  } else {
    // Verify functions required when wallet not connected
    btcClient.addProvider(getBitcoinDataProvider(btcConfig))
    btcClient.addProvider(new BitcoinSwapProvider({network: BitcoinNetworks[btcConfig.network]}, btcConfig.swapMode))
  }
  if (btcConfig.api) btcClient.addProvider(new BitcoinEsploraSwapFindProvider(btcConfig.api.url))

  return btcClient
}

function createEthClient (asset, wallet) {
  const ethConfig = config.assets.eth
  const ethClient = new Client()
  ethClient.addProvider(new EthereumRpcProvider(
    ethConfig.rpc.url
  ))
  if (wallet === 'metamask') {
    ethClient.addProvider(new EthereumMetaMaskProvider(web3.currentProvider, EthereumNetworks[ethConfig.network]))
  } else if (wallet === 'ethereum_ledger') {
    ethClient.addProvider(new EthereumLedgerProvider({network: EthereumNetworks[ethConfig.network]}))
  }
  ethClient.addProvider(new EthereumSwapProvider())
  if (ethConfig.api) {
    if (ethConfig.api.type === 'blockscout') ethClient.addProvider(new EthereumBlockscoutSwapFindProvider(ethConfig.api.url))
    if (ethConfig.api.type === 'scraper') ethClient.addProvider(new EthereumScraperSwapFindProvider(ethConfig.api.url))
  }
  return ethClient
}

function createERC20Client (asset, wallet) {
  const assetConfig = config.assets[asset]
  const erc20Client = new Client()
  erc20Client.addProvider(new EthereumRpcProvider(
    assetConfig.rpc.url
  ))
  if (wallet === 'metamask') {
    erc20Client.addProvider(new EthereumMetaMaskProvider(web3.currentProvider, EthereumNetworks[assetConfig.network]))
  } else if (wallet === 'ethereum_ledger') {
    erc20Client.addProvider(new EthereumLedgerProvider({network: EthereumNetworks[assetConfig.network]}))
  }
  erc20Client.addProvider(new EthereumErc20Provider(assetConfig.contractAddress))
  erc20Client.addProvider(new EthereumErc20SwapProvider())
  if (assetConfig.api) {
    if (assetConfig.api.type === 'scraper') erc20Client.addProvider(new EthereumErc20ScraperSwapFindProvider(assetConfig.api.url))
  }
  return erc20Client
}

const clientCreators = {
  btc: createBtcClient,
  eth: createEthClient,
  erc20: createERC20Client
}

const clients = {}

function getClient (asset, wallet) {
  if (!(asset in clients)) {
    clients[asset] = {}
  }
  if (wallet in clients[asset]) return clients[asset][wallet]
  const assetConfig = config.assets[asset]
  const creator = clientCreators[asset] || clientCreators[assetConfig.type]
  const client = creator(asset, wallet)
  clients[asset][wallet] = client
  return client
}

export { getClient }
