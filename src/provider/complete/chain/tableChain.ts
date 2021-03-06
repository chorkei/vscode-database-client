import * as vscode from "vscode";
import { ModelType } from "../../../common/constants";
import { TableNode } from "../../../model/main/tableNode";
import { ConnectionManager } from "../../../service/connectionManager";
import { ComplectionChain, ComplectionContext } from "../complectionContext";

export class TableChain implements ComplectionChain {

    public async getComplection(complectionContext: ComplectionContext): Promise<vscode.CompletionItem[]> {

        if (complectionContext.preWord?.match(/\b(into|from|update|table|join)\b/ig)) {
            return await this.generateTableComplectionItem();
        }
        return null;
    }

    public stop(): boolean {
        return true;
    }

    private async generateTableComplectionItem(): Promise<vscode.CompletionItem[]> {

        const lcp = ConnectionManager.getLastConnectionOption();

        const nodes = await lcp?.getByRegion()?.getChildren()
        if (!nodes) {
            return []
        }

        let nodeList = []
        for (const node of nodes) {
            nodeList.push(...await node.getChildren())
        }
        return nodeList.map<vscode.CompletionItem>((tableNode: TableNode) => {
            const completionItem = new vscode.CompletionItem(tableNode.table);
            if (tableNode.comment) {
                completionItem.detail = tableNode.comment
            }
            completionItem.insertText = tableNode.wrap(tableNode.table);
            switch (tableNode.contextValue) {
                case ModelType.TABLE:
                    completionItem.kind = vscode.CompletionItemKind.Function;
                    break;
                case ModelType.VIEW:
                    completionItem.kind = vscode.CompletionItemKind.Module;
                    break;
                case ModelType.PROCEDURE:
                    completionItem.kind = vscode.CompletionItemKind.Reference;
                    break;
                case ModelType.FUNCTION:
                    completionItem.kind = vscode.CompletionItemKind.Method;
                    break;
                case ModelType.TRIGGER:
                    completionItem.kind = vscode.CompletionItemKind.Event;
                    break;
            }

            return completionItem;
        });
    }
}
