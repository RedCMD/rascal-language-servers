/*
 * Copyright (c) 2018-2023, NWO-I CWI and Swat.engineering
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
import { debug, DebugConfiguration, DebugSession, Terminal, window } from "vscode";
import { RascalDebugAdapterDescriptorFactory } from "./RascalDebugAdapterDescriptorFactory";
import { RascalDebugConfigurationProvider } from "./RascalDebugConfigurationProvider";


/**
 * Debug Client that stores running debug sessions and available REPL ports for debug sessions.
 */
export class RascalDebugClient {
    rascalDescriptorFactory: RascalDebugAdapterDescriptorFactory;
    debugSocketServersPorts: Map<number, number>; // Terminal processID -> socket server port for debug
    runningDebugSessionsPorts: Set<number>; // Stores all running debug session server ports

    constructor(){
        this.rascalDescriptorFactory = new RascalDebugAdapterDescriptorFactory();
        this.debugSocketServersPorts = new Map<number, number>();
        this.runningDebugSessionsPorts = new Set<number>();

        debug.registerDebugConfigurationProvider("rascalmpl", new RascalDebugConfigurationProvider(this));
        debug.registerDebugAdapterDescriptorFactory("rascalmpl", this.rascalDescriptorFactory);

        window.onDidCloseTerminal(async (terminal: Terminal) => {
            const processId = await terminal.processId;
            if(processId !== undefined && this.debugSocketServersPorts.has(processId)){
                this.debugSocketServersPorts.delete(processId);
            }
        });

        debug.onDidStartDebugSession(async (debugsession: DebugSession) => {
            if(debugsession.configuration.serverPort !== undefined && typeof debugsession.configuration.serverPort === "number"){
                this.runningDebugSessionsPorts.add(debugsession.configuration.serverPort);
            }
        });

        debug.onDidTerminateDebugSession(async (debugsession: DebugSession) => {
            if(debugsession.configuration.serverPort !== undefined && typeof debugsession.configuration.serverPort === "number" 
            && this.runningDebugSessionsPorts.has(debugsession.configuration.serverPort)){
                this.runningDebugSessionsPorts.delete(debugsession.configuration.serverPort);
            }
        });

    }

    async startDebuggingSession(serverPort: number){
        const conf: DebugConfiguration = {type: "rascalmpl", name: "Rascal debugger", request: "attach", serverPort: serverPort};
        debug.startDebugging(undefined, conf);
    }

    registerDebugServerPort(processID: number, serverPort: number){
        this.debugSocketServersPorts.set(processID, serverPort);
    }

    getServerPort(processID: number | undefined){
        if(processID !== undefined && this.debugSocketServersPorts.has(processID)){
            return this.debugSocketServersPorts.get(processID);
        }
        return undefined;
    }

    isConnectedToDebugServer(serverPort: number){
        return this.runningDebugSessionsPorts.has(serverPort);
    }

}
