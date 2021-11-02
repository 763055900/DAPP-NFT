import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import axios from 'axios'

import web3 from 'web3'
import Web3Modal from "web3modal"
import Fortmatic from "fortmatic";
import WalletConnectProvider from "@walletconnect/web3-provider";

import {
  nftmarketaddress, nftaddress, nftabi, nftmarketabi
} from '../config'



export default function Home() {
  const [nfts, setNfts] = useState([])
  const [loaded, setLoaded] = useState('not-loaded')
  useEffect(() => {
    loadNFTs()
  }, [])
  async function loadNFTs() {
    const providerOptions = {
      fortmatic: {
        package: Fortmatic,
        options: {
          // Mikko's TESTNET api key
          key: "pk_test_391E26A3B43A3350"
        }
      },
      walletconnect: {
        package: WalletConnectProvider, // required
        options: {
          infuraId: "INFURA_ID" // required
        }
      }
    };
    const web3Modal = new Web3Modal({
      network: "mainnet",
      cacheProvider: true,
      disableInjectedProvider: false,
      providerOptions: providerOptions, // required
    });
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const tokenContract = new ethers.Contract(nftaddress, nftabi, provider)
    const marketContract = new ethers.Contract(nftmarketaddress, nftmarketabi, provider)
    const data = await marketContract.fetchMarketItems()

    const items = await Promise.all(data.map(async i => {
      const tokenUri = await tokenContract.tokenURI(i.tokenId)
      const meta = await axios.get(tokenUri)
      let price = web3.utils.fromWei(i.price.toString(), 'ether');
      let item = {
        price,
        tokenId: i.tokenId.toNumber(),
        seller: i.seller,
        owner: i.owner,
        image: meta.data.image,
        name: meta.data.name,
        description: meta.data.description,
      }
      return item
    }))
    console.log('items: ', items)
    setNfts(items)
    setLoaded('loaded')
  }
  async function buyNft(nft) {
    const web3Modal = new Web3Modal({
      network: "mainnet",
      cacheProvider: true,
    });
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
    const contract = new ethers.Contract(nftmarketaddress, nftmarketabi, signer)

    const price = web3.utils.toWei(nft.price.toString(), 'ether');

    console.log('price: ', price);

    const transaction = await contract.createMarketSale(nftaddress, nft.tokenId, {
      value: price
    })
    await transaction.wait()
    loadNFTs()
  }

  if (loaded === 'loaded' && !nfts.length) return (<h1 className="p-20 text-4xl">No NFTs!</h1>)
  return (
    <div className="flex justify-center">
      <div style={{ width: 900 }}>
        <div className="grid grid-cols-2 gap-4 pt-8">
          {
            nfts.map((nft, i) => (
              <div key={i} className="border p-4 shadow">
                <img src={nft.image} className="rounded" />
                <p className="text-2xl my-4 font-bold">Price: {nft.price}</p>
                <p className="text-2xl my-4 font-bold">Name: {nft.name}</p>
                <p className="text-2xl my-4 font-bold">Description: {nft.description}</p>
                <button className="bg-green-600 text-white py-2 px-12 rounded" onClick={() => buyNft(nft)}>Buy NFT</button>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
