import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NFTStorage, File } from 'nft.storage';
import { Contract, providers } from 'ethers';
import Web3Modal from 'web3modal';

import {
  LAND_CONTRACT_ADDRESS,
  LAND_ABI
} from "./contract";

function App() {
  const CHAIN_ID = 11155111;
  const NETWORK_NAME = "Sepolia";

  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null)
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [owner, setOwner] = useState(null);
  const [nextOwner, setNextOwner] = useState(null);
  const [imageHash, setImageHash] = useState("");
  const [landSize, setLandSize] = useState("");
  const [landLocation, setLandLocation] = useState("");
  const [landDocument, setLandDocument] = useState("");
  const [nextOwnerAddress, setNextOwnerAddress] = useState(null);

  const web3ModalRef = useRef();

  const client = new NFTStorage({ token: process.env.REACT_APP_NFT_STORAGE_KEY });

  // Helper function to fetch a Provider instance from Metamask
  const getProvider = useCallback(async () => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);
    const getSigner = web3Provider.getSigner();

    const { chainId } = await web3Provider.getNetwork();

    setAccount(await getSigner.getAddress());
    setWalletConnected(true)


    if (chainId !== CHAIN_ID) {
      window.alert(`Please switch to the ${NETWORK_NAME} network!`);
      throw new Error(`Please switch to the ${NETWORK_NAME} network`);
    }

    setProvider(web3Provider);
  }, []);

  // Helper function to fetch a Signer instance from Metamask
  const getSigner = useCallback(async () => {
    const web3Modal = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(web3Modal);

    const { chainId } = await web3Provider.getNetwork();

    if (chainId !== CHAIN_ID) {
    window.alert(`Please switch to the ${NETWORK_NAME} network!`);
        throw new Error(`Please switch to the ${NETWORK_NAME} network`);
    }
    
    const signer = web3Provider.getSigner();
    return signer;
  }, []);


  const getLandInstance = useCallback((providerOrSigner) => {
    return new Contract(
      LAND_CONTRACT_ADDRESS,
      LAND_ABI,
      providerOrSigner
    )
  },[])

  const connectWallet = useCallback(async () => {
    try {
        web3ModalRef.current = new Web3Modal({
            network: NETWORK_NAME,
            providerOptions: {},
            disableInjectedProvider: false,
        });

        await getProvider();
    } catch (error) {
        console.error(error);
    }
  },[getProvider]);

  const claimOwnership = async (e) => {
    e.preventDefault();

    try {
      const signer = await getSigner();
      const landContract = getLandInstance(signer);
      const txn = await landContract.claimOwnership(nextOwnerAddress);
      setLoading(true);
      await txn.wait();
      setLoading(false);

      const owner = await landContract.owner;

      setOwner(owner);
    } catch (error) {
        console.error(error);
    }
  }

  const transferOwnership = async(e) => {
    e.preventDefault();

    if(nextOwnerAddress === null) {
      alert("input next owner address");
    } else {
      try {
        const signer = await getSigner();
        const landContract = getLandInstance(signer);
        const txn = await landContract.transferLandOwnership(nextOwnerAddress);
        setLoading(true);
        await txn.wait();
        setLoading(false);

        const nextOwner = await landContract.nextOwner();

        setNextOwner(nextOwner);
      } catch (error) {
          console.error(error);
      }
    }
  }

  const updateLandDocument = async (e) => {
    e.preventDefault();

    try {
        setLoading(true);

        const metadata = await client.store({
            name: "Land document",
            description: "This document carries the ownership details of this land",
            image: new File([file], 'land.pdf', { type: 'pdf' })
        });

        console.log(metadata);

        const cid = metadata.ipnft;

        const signer = await getSigner();
        const landContract = getLandInstance(signer);
        const txn = await landContract.updateLandDocs(cid);
        await txn.wait();
        setLoading(false);
    } catch (error) {
        console.error(error);
    }
  }


  useEffect(() => {
    const fetchLandContractDetails = async () => {
      if(account && provider){
        const landContract = getLandInstance(provider);
        const imageHash = await landContract.landImageHash();
        const landSize = await landContract.landSize();
        const landLocation = await landContract.landLocation();
        const landDocument = await landContract.landDocumentPDFHash();
        const landOwner = await landContract.owner();
        const nextOwner = await landContract.nextOwner();

        setImageHash(imageHash);
        setLandSize(landSize);
        setLandLocation(landLocation);
        setLandDocument(landDocument);
        setOwner(landOwner);
        setNextOwner(nextOwner);
      }
    }

    fetchLandContractDetails()
  }, [account, provider]);

  useEffect(() => {
    if(!walletConnected) {
        connectWallet();
    }
  }, [walletConnected, connectWallet]);

  return (
    <div className="App">
      <div className="container mb-5">
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
          <a className="navbar-brand text-dark font-weight-bold" href="!#">Land Tenure System</a>
          
          <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarText" aria-controls="navbarText" aria-expanded="false" aria-label="Toggle navigation"
          >
              <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarText">
            <ul className="navbar-nav mr-auto"></ul>
            
            <span className="navbar-text">
              {!walletConnected ? <button className="btn btn-secondary" onClick={connectWallet}>Connect Wallet</button> : <button className="btn btn-dark" disabled>{account !== null && `Connected: ${account.substring(0, 8)}...${account.substring(38)}`}</button>}
            </span>
          </div>
        </nav>
      </div>

      <div className="container">
        <div className="row">
          <div className="col-md-8">
            <div className="card">
              <img src={`https://ipfs.io/ipfs/${imageHash}`} alt="" />

              <div className="card-body">
                <h6 className='mb-1'>Size: {landSize}</h6>
                <p className='text-secondary'>Location: {landLocation}</p>
              </div>
              
              <div className="card-footer">
                {landDocument !== "" && <a target='_blank' rel="noreferrer" href={`https://ipfs.io/ipfs/${landDocument}/image/land.pdf`}>View Land Document</a>}
              </div>
            </div>
          </div>

          <div className="col-md-4">
            {walletConnected && account === owner && 
              <div>
                <div className="card mb-4">
                  <div className="card-body">
                    <h4>Transfer Land Ownership</h4>
                    <form>
                      <div className="form-group">
                        <label htmlFor="nextOwner">New Owner Address</label>
                        <input id="nextOwner" onChange={(e) => setNextOwnerAddress(e.target.value)} type="text" className='form-control'/>
                      </div>

                      {loading ? <p>Transaction Processing ...</p> : <button className="btn btn-primary" onClick={transferOwnership}>Transfer Ownership</button>}
                    </form>
                  </div>
                </div>

                <div className="card">
                  <div className="card-body">
                    <h4>Update Land Document</h4>
                    <form>
                      <div className="form-group">
                        <label htmlFor="newDocument">New Document</label>
                        <input id="newDocument" type="file" onChange={(e) => setFile(e.target.files[0])} className='form-control' />
                      </div>

                      {loading ? <p>Transaction Processing ...</p> : <button className="btn btn-dark" onClick={updateLandDocument}>Update Land Document</button>}
                    </form>
                  </div>
                </div>
              </div>
            }

            {walletConnected && account === nextOwner &&
              <div className="card">
                <div className="card-body">
                  <p>You have been set to own this land, claim ownership</p>
                  {loading ? <p>Transaction Processing...</p> : <button className="btn btn-primary" onClick={claimOwnership}>Claim Ownership</button>}
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
