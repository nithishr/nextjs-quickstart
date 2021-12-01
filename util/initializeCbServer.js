import qs from 'qs'
import axios from 'axios'

import { delay } from './delay.js'
import {ensureIndexes} from "./ensureIndexes";

let DELAY_LENGTH = process.env.DELAY || 5000;

var username = process.env.COUCHBASE_USER
var password = process.env.COUCHBASE_PASSWORD
var auth = `Basic ${Buffer.from(username + ':' + password).toString('base64')}`

let COUCHBASE_BUCKET = process.env.COUCHBASE_BUCKET

// TODO: Fix bucket cteation error, everything else works
// It works with an empty database, but not when another bucket exists
const restCreateBucket = async() => {
  const data = { name: COUCHBASE_BUCKET, ramQuotaMB: 150, durabilityMinLevel: "none", replicaNumber: 0, replicaIndex: 0 }
  await axios({
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'Authorization': auth },
    data:
        qs.stringify(data),
        url: 'http://127.0.0.1:8091/pools/default/buckets',
  })
      .catch((error) => {
        if (error.response.data.errors && error.response.data.errors.ramQuota) {
          console.error("Error Creating Bucket:", error.response.data.errors.ramQuota);
          console.log("Try deleting other buckets or increasing cluster size. \n");
        } else {
          console.log(`Bucket may already exist: ${error.message}`);
        }
      })
}

const restCreateCollection = async() => {
  const data = { name: 'profile' }
  await axios({
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'Authorization': auth },
    data: qs.stringify(data),
    url: `http://127.0.0.1:8091/pools/default/buckets/${COUCHBASE_BUCKET}/scopes/_default/collections`,
  })
      .catch((error) => {
        if (error.response.status === 404) {
          console.error(`Error Creating Collection: bucket ${COUCHBASE_BUCKET} not found. \n`)
        } else {
          console.log(`Collection may already exist: ${error.message}`)
        }
      })
}

const initializeBucketAndCollection = async() => {
  await restCreateBucket()
  await delay(DELAY_LENGTH)
  await restCreateCollection()
  await delay(DELAY_LENGTH)
  console.log("## checking indexes ##");
  await delay(DELAY_LENGTH)
  await ensureIndexes(COUCHBASE_BUCKET);
  await delay(DELAY_LENGTH)
  console.log("## initialize db script end ##")
}

initializeBucketAndCollection().then(() => {
  console.log("Database Initialization Successful");
  process.exit(0)
}).catch((err) => {
  console.log("Database Initialization Failed: \n\t" + err);
  process.exit(1);
})
