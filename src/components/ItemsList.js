import React from 'react';
import firebase from '../lib/firebase';
import Nav from './Nav';
import '../styles/ItemsList.css';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import calculateEstimate from '../lib/estimates';
import { useHistory } from 'react-router-dom';
import '../styles/ItemsList.css';

const db = firebase.firestore().collection('shopping_list');
const wasItemPurchasedWithinLastOneDay = (purchaseDates) => {
  if (!purchaseDates.length) return false;
  const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
  const { length } = purchaseDates;
  return Date.now() - purchaseDates[length - 1] <= oneDayInMilliseconds;
};

const getDaysBetweenCurrentAndPreviousPurchase = (
  previousPurchaseDate,
  currentPurchaseDate = Date.now(),
) => {
  const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
  return (currentPurchaseDate - previousPurchaseDate) / oneDayInMilliseconds;
};

const ItemsList = () => {
  const userToken = localStorage.getItem('token');
  const history = useHistory();

  const [shoppingList, loading, error] = useCollectionData(
    db.where('token', '==', userToken),
    { idField: 'documentId' },
  );

  const markItemAsPurchased = (index) => {
    const { items, documentId } = shoppingList[0];
    const shoppingItemObject = items[index];

    /*
    If purchaseDates array is empty, first purchase is being
    recorded. If it is not empty, either the user is unchecking
    an item which has been marked purchased or recording another 
    purchase for the same item. The former is handled in the if 
    clause while the latter in the else clause.

    To determine whether a user is clearing check mark after 
    marking an item purchased by mistake, we check if the latest
    purchase was made within the last one day. The same can also 
    be achieved by using the checked status of the checkbox but
    that would require passing event object to markItemAsPurchased.
    
    We have optimized this code to store the latest 2 purchase
    dates instead of storing dates for all purchases. The same applies
    to daysLeftForNextPurchase. It is worth pointing out that 
    daysLeftForNextPurchase will have a value when adding an item
    to the shopping list, selected from "Soon", "Not soon", "Kind of soon"

    */

    if (!shoppingItemObject.purchaseDates.length) {
      shoppingItemObject.purchaseDates.push(Date.now());
      shoppingItemObject.numberOfPurchases++;
      shoppingItemObject.daysLeftForNextPurchase[0] = calculateEstimate(
        undefined,
        shoppingItemObject.daysLeftForNextPurchase[0],
        shoppingItemObject.numberOfPurchases,
      );
    } else {
      if (wasItemPurchasedWithinLastOneDay(shoppingItemObject.purchaseDates)) {
        shoppingItemObject.purchaseDates.pop();
        shoppingItemObject.numberOfPurchases--;
        if (shoppingItemObject.purchaseDates.length) {
          shoppingItemObject.daysLeftForNextPurchase.pop();
        }
      } else {
        const dateTodayInMilliseconds = Date.now();
        shoppingItemObject.numberOfPurchases++;
        const lastEstimate =
          shoppingItemObject.daysLeftForNextPurchase[
            shoppingItemObject.daysLeftForNextPurchase.length - 1
          ];
        const latestInterval = getDaysBetweenCurrentAndPreviousPurchase(
          shoppingItemObject.purchaseDates[
            shoppingItemObject.purchaseDates.length - 1
          ],
          dateTodayInMilliseconds,
        );
        const daysLeftForNextPurchase = calculateEstimate(
          lastEstimate,
          latestInterval,
          shoppingItemObject.numberOfPurchases,
        );
        shoppingItemObject.purchaseDates.push(dateTodayInMilliseconds);
        shoppingItemObject.daysLeftForNextPurchase.push(
          daysLeftForNextPurchase,
        );
      }
    }

    if (shoppingItemObject.purchaseDates.length > 2) {
      shoppingItemObject.purchaseDates = shoppingItemObject.purchaseDates.slice(
        -2,
      );
      shoppingItemObject.daysLeftForNextPurchase = shoppingItemObject.daysLeftForNextPurchase.slice(
        -2,
      );
    }

    db.doc(documentId)
      .update({
        items: items,
      })
      .then(() => console.log('Successfully updated item'))
      .catch((e) => console.log('error', e));
  };

  const handleRedirect = () => {
    history.push('/additem');
  };

  return (
    <div className="items-list">
      <h1>Your Shopping List</h1>
      {loading && <p>Loading...</p>}
      {error && <p>An error has occured...</p>}
      {shoppingList && !shoppingList.length && (
        <div className="add-item">
          <p>You haven't created a shopping list yet...</p>
          <button type="submit" onClick={handleRedirect}>
            Add First Item
          </button>
        </div>
      )}
      <form>
        <ul>
          {shoppingList &&
            shoppingList[0] &&
            shoppingList[0].items.map((shoppingItemObject, index) => {
              return (
                <li key={shoppingItemObject.shoppingListItemName + index}>
                  <input
                    type="checkbox"
                    id={shoppingItemObject.shoppingListItemName}
                    onChange={() => markItemAsPurchased(index)}
                    checked={wasItemPurchasedWithinLastOneDay(
                      shoppingItemObject.purchaseDates,
                    )}
                  />
                  <label htmlFor={shoppingItemObject.shoppingListItemName}>
                    {shoppingItemObject.shoppingListItemName}
                  </label>
                </li>
              );
            })}
        </ul>
      </form>
      <Nav />
    </div>
  );
};

export default ItemsList;
