import neatCsv from 'neat-csv';
// const neatCsv = require('neat-csv');
import { parse } from 'csv';
import csvParser from 'csv-parser';
// const { parse } = require('csv');
import csvWriter from 'csv-writer';
import fs from 'fs';
import * as fsPromises from 'fs/promises';
// const fsPromises = require('fs/promises');
import path, { dirname } from 'path';
// const path = require('path');


const CSV_FILE_PATH = 'posts.csv';
const TOP_POSTS_PATH = 'top_posts.csv';
const OTHER_POSTS_PATH = 'other_posts.csv';
const DAILY_TOP_POSTS_PATH = 'daily_top_posts.csv';

const PUBLIC = 'public';

(async function init() {
    const csvFile = await fsPromises.readFile(CSV_FILE_PATH, 'utf-8');
    // const data = [];
    // fs.createReadStream(CSV_FILE_PATH)
    //     .pipe(csvParser())
    //     .on('data', row => {
    //         // console.log('row: ', row);
    //         data.push(row);
    //     })
    //     .on('end', () => {
    //         console.log('data: ', data.filter(post => post.id === '4839504'));
    //     })
    

    // const parsed = await parse(csvFile);
    // console.log('csv: ', parsed);
    const postList = await neatCsv(csvFile);
    // const postList = await neatCsv(csvFile, {escape: '"', quote: '"'});
    // const postList = await neatCsv(csvFile, {escape: '"', quote: '"', strict: true});
    const formattedData = postList.reduce((output, post) => {
        return post.timestamp ? output.concat(post) : output.concat(fixData(post));
    }, []);
    // console.log('bad: ', formattedData.filter(post => post.id === '4839504'));

    // console.log('postList: ', postList.slice(0,3), Array.isArray(postList), 'id: ', typeof postList[0].id);
    // console.log('csv: ', postList.filter(post => ['4839504', '4839506'].includes(post.id)));
    const output = generatePostLists(formattedData);
    console.log('output: ', output);
    // const { topPosts, otherPosts, dailyTopPosts } = output;

    // const topPostsWrite = fsPromises.writeFile(TOP_POSTS_PATH, topPosts);
    // const otherPostsWrite = fsPromises.writeFile(OTHER_POSTS_PATH, otherPosts);
    // const writeRequests = [topPostsWrite, otherPostsWrite];
    // await Promise.all(writeRequests);
    // BONUS:
    // output json
    // output full record, not just id

})();

/**
 * Csv parser is not correctly escaping double quotes
 * Ex of badly parsed data: {
    id: '4839504',
    title: `Funniest "I Can't Go to Bed Yet" Excuses,private,73,16735,11,Sat Oct 12 06:10:48 2015`
  },
 * @param {*} post 
 */
function fixData(post) {
    const { id, title: incorrectlyFormattedTitle } = post;
    const [title, privacy, likes, views, comments, timestamp] = incorrectlyFormattedTitle.split(',');
    return { id, title, privacy, likes, views, comments, timestamp};
}

function generatePostLists(postList) {
    return postList.reduce((lists, post) => {
        const { id, privacy, views, comments, title, likes, timestamp } = post;
        const date = parseDate(timestamp);
        const isTopPost = (privacy === PUBLIC) && (title.length < 40) && (+comments > 10) && (+views > 9000); 
        if (isTopPost) {
            lists.topPosts.push(id);
        } else {
            lists.otherPosts.push(id);
        }
        
        const isNewDay = !lists.dailyTopPosts[date]; // if current date has no posts yet, its first post automatically becomes the most-liked
        const currentPostHasMoreLikes = lists.dailyTopPosts[date] && +lists.dailyTopPosts[date].likes < +likes;
        // if (date === 'Invalid Date') {
        //     console.log('invalid post: ', post);
        //     console.log('teimstapm: ', timestamp);
        //     console.log('date: ', date);
        // }
        if (isNewDay || currentPostHasMoreLikes) {
            lists.dailyTopPosts[date] = post;
        }
        return lists;
    }, {topPosts: [], otherPosts: [], dailyTopPosts: {}});
}

/**
 * Ex: Change timestamp 'Fri Oct 11 04:05:42 2015' to '10/11/2015'
 * @param {*} timestamp 
 */
function parseDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
};

