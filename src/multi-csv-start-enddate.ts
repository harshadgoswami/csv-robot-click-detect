import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

interface UserClick {
    clickStart: string;
    clickEnd: string;
}

// Folder containing the CSV files
const folderPath = './csvs';

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
const isRobot = (clicks: UserClick[]): { isBot: boolean, totalTimeInHours: number, longestClickInMinutes: number } => {
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
    return { isBot: totalTimeInHours > 8 && longestClickInMinutes > 20, totalTimeInHours, longestClickInMinutes };
};

// Function to process each CSV file and group by date
const processCsvFile = (filePath: string, userId: string) => {
    const clicksByDate: Record<string, UserClick[]> = {};

    return new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                const clickStart = row.clickStart;
                const clickEnd = row.clickEnd;

                const date = extractDate(clickStart);  // Extract the date portion from clickStart

                // Initialize the data structure if it doesn't exist for the date
                if (!clicksByDate[date]) {
                    clicksByDate[date] = [];
                }

                // Add the current click to the user's data for that specific date
                clicksByDate[date].push({ clickStart, clickEnd });
            })
            .on('end', () => {
                // After reading the CSV, evaluate the clicks for each date
                for (const [date, clicks] of Object.entries(clicksByDate)) {
                    const { isBot, totalTimeInHours, longestClickInMinutes } = isRobot(clicks);
                    console.log(`User ${userId} on ${date} is ${isBot ? 'a robot' : 'a human'} total time: ${totalTimeInHours} and longest click minutes: ${longestClickInMinutes}`);
                }
                resolve();
            })
            .on('error', (err) => {
                console.error(`Error processing file ${filePath}:`, err);
                reject(err);
            });
    });
};

// Function to process all CSV files in the folder
const processAllCsvFiles = async () => {
    try {
        const files = fs.readdirSync(folderPath);

        const csvFiles = files.filter(file => file.endsWith('.csv'));

        // Process each CSV file in the folder
        for (const file of csvFiles) {
            const userId = path.basename(file, '.csv');  // Extract userId from filename
            const filePath = path.join(folderPath, file);

            // Process the CSV file
            await processCsvFile(filePath, userId);
        }

    } catch (error) {
        console.error('Error reading CSV files:', error);
    }
};

// Start processing all CSV files
processAllCsvFiles();
