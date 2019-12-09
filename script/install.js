const { exec } = require('child_process');

const execute = async function (command) {
    exec(command, (err, out) => {
        console.log(`
-------------------------------------------------------------
${command}
-------------------------------------------------------------
`);

        if (err)
            return console.log(err.message);
        
        console.log('Installed: ', command);
        console.log(out);
    });
}

execute('npm i');
execute('cd vscode-extension && npm i && cd ..');
execute('cd photoshop-extension && npm i && cd ..');
