export function registerGracefulExit(callback:() => void) {
    let logAndExit = function () {
        console.log("Exiting");
        callback();
        process.exit();
    };

    // handle graceful exit
    //do something when app is closing
    // process.on('exit', logAndExit);
    //catches ctrl+c event
    process.on('SIGINT', logAndExit);
    process.on('SIGTERM', logAndExit);
    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', logAndExit);
    process.on('SIGUSR2', logAndExit);

    process.on('unhandledRejection', (reason, p) => {
        console.error(reason, 'Unhandled Rejection at Promise', p);
        logAndExit();
    });
    process.on('uncaughtException', err => {
        console.error(err, 'Uncaught Exception thrown');
        logAndExit();
    });
}
