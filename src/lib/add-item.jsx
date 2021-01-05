import React, { useState } from 'react';
import firebase from './firebase';

const AddItemsToList = () => {
  const [title, setTitle] = useState('');
  const [number, setNumber] = useState('');

  function onSubmit(e) {
    e.preventDefault();
    firebase
      .firestore()
      .collection('items')
      .add({
        item: title,
        how_much: parseInt(number),
      })
      .then(() => {
        setTitle('');
        setNumber('');
      });
  }

  return (
    <form onSubmit={onSubmit}>
      <h2>Add Items to List</h2>
      <div>
        <label>
          Name
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
          />
        </label>
      </div>
      <div>
        <label>
          How much
          <input
            type="number"
            value={number}
            onChange={(e) => setNumber(e.currentTarget.value)}
          />
        </label>
      </div>
      <button>Add Item</button>
    </form>
  );
};

export default AddItemsToList;
