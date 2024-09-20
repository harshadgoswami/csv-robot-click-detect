import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

interface UserActivity {
    date: string;
}

// Folder containing the CSV files
const folderPath = './csvs';

// Helper function to parse date strings
const parseDate = (dateStr: string): Date => {
    return new Date(dateStr);
};

// Helper function to calculate the difference in minutes between two dates
const calculateTimeDifferenceInMinutes = (start: Date, end: Date): number => {
    const MS_PER_MINUTE = 1000 * 60;
    return (end.getTime() - start.getTime()) / MS_PER_MINUTE;
};

// Helper function to check if a user is a robot based on continuous activity exceeding 5 hours
const isRobot = (dates: UserActivity[]): { isBot: boolean, allFoundContinuousStart: string } => {
    const MINUTES_THRESHOLD = 9;
    const HOURS_THRESHOLD = 5;
    const MINUTES_IN_5_HOURS = HOURS_THRESHOLD * 60;

    let totalContinuousTime = 0;
    let continuousStart: Date | null = null;
    let allFoundContinuousStart = [];

    for (let i = 0; i < dates.length - 1; i++) {
        const current = parseDate(dates[i].date);
        const next = parseDate(dates[i + 1].date);

        const timeDifference = calculateTimeDifferenceInMinutes(current, next);

        if (timeDifference < MINUTES_THRESHOLD) {
            // If continuous period hasn't started, mark the start
            if (!continuousStart) {
                continuousStart = current;
                allFoundContinuousStart.push(dates[i].date);
            }

            // Accumulate the total continuous time
            totalContinuousTime += timeDifference;

            // If the continuous time exceeds 5 hours, mark as robot
            if (totalContinuousTime >= MINUTES_IN_5_HOURS) {
                return { isBot: true, allFoundContinuousStart: allFoundContinuousStart.join(",") }; // Robot detected
            }
        } else {
            // Reset the continuous tracking


            continuousStart = null;
            totalContinuousTime = 0;


        }
    }

    return { isBot: false, allFoundContinuousStart: allFoundContinuousStart.join(",") }; // Not a robot
};

// Function to process each CSV file
const processCsvFile = (filePath: string, userId: string) => {
    const userActivities: UserActivity[] = [];

    return new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                const date = row.clickStart;
                userActivities.push({ date });
            })
            .on('end', () => {
                const { isBot, allFoundContinuousStart } = isRobot(userActivities);
                console.log(`User ${userId} is ${isBot ? 'a robot' : 'a human'} and allFoundContinuousStart: ${allFoundContinuousStart} \n\n`);
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
