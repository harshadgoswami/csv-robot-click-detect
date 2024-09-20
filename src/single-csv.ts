import fs from 'fs';
import csv from 'csv-parser';

interface UserClick {
    userId: string;
    clickStart: string;
    clickEnd: string;
}

// Helper function to parse date strings
const parseDate = (dateStr: string): Date => {
    return new Date(dateStr);
};

// Extracts just the date portion (YYYY-MM-DD) from a full timestamp
const extractDate = (dateStr: string): string => {
    return dateStr.split(' ')[0];
};

// Helper function to calculate duration in milliseconds between two dates
const calculateDuration = (start: Date, end: Date): number => {
    return end.getTime() - start.getTime(); // returns milliseconds
};

// Helper function to check if a user is a robot based on the criteria
const isRobot = (clicks: UserClick[]): { isRobotDetected: boolean, totalTimeInHours: number, longestClickInMinutes: number } => {
    const MS_PER_HOUR = 1000 * 60 * 60;
    const MS_PER_MINUTE = 1000 * 60;

    let totalTime = 0;
    let longestClickDuration = 0;

    clicks.forEach(click => {
        const clickStart = parseDate(click.clickStart);
        const clickEnd = parseDate(click.clickEnd);

        const clickDuration = calculateDuration(clickStart, clickEnd);

        // Add the click duration to the total time
        totalTime += clickDuration;

        // Check if this is the longest click
        if (clickDuration > longestClickDuration) {
            longestClickDuration = clickDuration;
        }
    });

    // Convert totalTime from milliseconds to hours
    const totalTimeInHours = totalTime / MS_PER_HOUR;

    // Convert longestClickDuration from milliseconds to minutes
    const longestClickInMinutes = longestClickDuration / MS_PER_MINUTE;

    // Return true if total time exceeds 8 hours and longest click exceeds 20 minutes
    return { isRobotDetected: totalTimeInHours > 8 || longestClickInMinutes > 60, totalTimeInHours, longestClickInMinutes };
};

// Read and parse the CSV file
const usersClicks: Record<string, Record<string, UserClick[]>> = {};

fs.createReadStream('11.csv')
    .pipe(csv())
    .on('data', (row) => {
        const userId = row.userId;
        const clickStart = row.clickStart;
        const clickEnd = row.clickEnd;

        const date = extractDate(clickStart);  // Extract the date portion from clickStart

        // Initialize the data structure if it doesn't exist
        if (!usersClicks[userId]) {
            usersClicks[userId] = {};
        }
        if (!usersClicks[userId][date]) {
            usersClicks[userId][date] = [];
        }

        // Add the current click to the user's data for that specific date
        usersClicks[userId][date].push({ userId, clickStart, clickEnd });
    })
    .on('end', () => {
        // After reading the CSV, evaluate each user for each date
        for (const [userId, dates] of Object.entries(usersClicks)) {
            for (const [date, clicks] of Object.entries(dates)) {
                const { isRobotDetected, totalTimeInHours, longestClickInMinutes } = isRobot(clicks);
                console.log(`User ${userId} on ${date} is ${isRobotDetected ? 'a robot' : 'a human'} total Hours ${totalTimeInHours} and longest Minutes ${longestClickInMinutes}`);
            }
        }
    });
