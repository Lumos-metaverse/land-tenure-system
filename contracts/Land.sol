// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract Land {
    event NextOwnerUpdated(address nextOwner);
    event OwnershipClaimed(address newOwner);

    address public owner;
    address public nextOwner;
    string public landDocumentPDFHash;
    string public landImageHash;
    string public landSize;
    string public landLocation;

    constructor(address _owner, string memory _landSize, string memory _landLocation, string memory _landImageHash) {
        owner = _owner;
        landSize = _landSize;
        landLocation = _landLocation;
        landImageHash = _landImageHash;
    }

    function updateLandDocs(string memory _newLandDocumentPDFHash) external {
        onlyOwner();
        landDocumentPDFHash = _newLandDocumentPDFHash;
    }

    function transferLandOwnership(address _nextOwner) external {
        onlyOwner();
        nextOwner = _nextOwner;

        emit NextOwnerUpdated(_nextOwner);
    }

    function claimOwnership() external {
        require(msg.sender == nextOwner, "only next owner can accept ownership");

        owner = nextOwner;
        nextOwner = address(0);

        emit OwnershipClaimed(owner);
    }

    function getLandDocument() external view returns (string memory) {
        return landDocumentPDFHash;
    }

    function onlyOwner() private view {
        require(msg.sender == owner, "not owner");
    }
}