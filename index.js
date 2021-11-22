import neatCsv from 'neat-csv';
import { createObjectCsvWriter } from 'csv-writer';
import * as fsPromises from 'fs/promises';

async function generateOutput() {
    const [,,modes] = process.argv;
    
    const { 
        CSV_FILE_PATH, TOP_POSTS_PATH, OTHER_POSTS_PATH, DAILY_TOP_POSTS_PATH
    } = getConstants();

    const csvFile = await fsPromises.readFile(CSV_FILE_PATH, 'utf-8');
    const postList = await neatCsv(csvFile);
    const formattedData = formatData(postList);
    const postOutput = generatePostLists(formattedData);
    const { topPosts, otherPosts, dailyTopPosts } = postOutput;
    const dailyTopPostValues = Object.values(dailyTopPosts);

    const topPostsWrite = writeOutputFile(topPosts, TOP_POSTS_PATH, modes);
    const otherPostsWrite = writeOutputFile(otherPosts, OTHER_POSTS_PATH, modes);
    const dailyTopPostsWrite = writeOutputFile(dailyTopPostValues, DAILY_TOP_POSTS_PATH, modes);
    const writeRequests = [topPostsWrite, otherPostsWrite, dailyTopPostsWrite];
    await Promise.all(writeRequests);
}

function formatData(postList) {
    return postList.reduce((output, post) => post.timestamp ? output.concat(post) : output.concat(adjustPost(post)), []);
}

/**
 * Csv parser is not correctly escaping double quotes; this method 
 * correctly formats the non-escaped rows
 * Ex of badly parsed data: {
    id: '4839504',
    title: `Funniest "I Can't Go to Bed Yet" Excuses,private,73,16735,11,Sat Oct 12 06:10:48 2015`
  },
 * @param {*} post 
 */
function adjustPost(post) {
    const { id, title: incorrectlyFormattedTitle } = post;
    const [title, privacy, likes, views, comments, timestamp] = incorrectlyFormattedTitle.split(',');
    return { id, title, privacy, likes, views, comments, timestamp};
}


async function writeOutputFile(postList, path, modes) {
    let jsonMode = false;
    let detailMode = false;
    if (modes) {
        jsonMode = modes.includes('j');
        detailMode = modes.includes('d');
    }

    if (jsonMode) {
        const postData = detailMode ? postList : postList.map(post => post.id);
        return fsPromises.writeFile(`${path}.json`, JSON.stringify(postData));
    } else {
        let header = [{id: 'id', title: 'id'}];
        if (detailMode) {
            const additionalFields = [
                {id: 'title', title: 'title'},
                {id: 'privacy', title: 'privacy'},
                {id: 'likes', title: 'likes'},
                {id: 'views', title: 'views'},
                {id: 'comments', title: 'comments'},
                {id: 'timestamp', title: 'timestamp'}
            ];
            header = header.concat(...additionalFields);
        }
        return createObjectCsvWriter({path: `${path}.csv`,header}).writeRecords(postList);
    }
}

function generatePostLists(postList) {
    const { PUBLIC } = getConstants();
    return postList.reduce((lists, post) => {
        const { privacy, views, comments, title, likes, timestamp } = post;
        const date = parseDate(timestamp);
        const isTopPost = (privacy === PUBLIC) && (title.length < 40) && (+comments > 10) && (+views > 9000); 
        if (isTopPost) {
            lists.topPosts.push(post);
        } else {
            lists.otherPosts.push(post);
        }
        const isNewDay = !lists.dailyTopPosts[date]; // if current date has no posts yet, its first post automatically becomes the most-liked
        const currentPostHasMoreLikes = lists.dailyTopPosts[date] && +lists.dailyTopPosts[date].likes < +likes;
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

function getConstants() {
    return {
        CSV_FILE_PATH: 'posts.csv',
        TOP_POSTS_PATH: 'top_posts',
        OTHER_POSTS_PATH: 'other_posts',
        DAILY_TOP_POSTS_PATH: 'daily_top_posts',
        PUBLIC: 'public'
    };
}

generateOutput();
