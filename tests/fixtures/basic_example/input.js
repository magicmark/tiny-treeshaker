import { Bar, Baz, Boz, Foo as MyFoo } from 'some/module2';
import { Qux as Quux, Qux2 } from 'some/module3';

import Fooooo from 'some/module1'

const unused1 = () => {},
    hello = 'world';
const unused2 = '';
function unused3() {}
const unused4 = function () {};

const getFoo = () => 'Foo';
const getFooBar = () => `${getFoo()} Bar`;

function getFooBarBaz() {
    return `${getFooBar} Baz`;
}

export function main() {
    MyFoo();
    Boz();
    console.log(getFooBarBaz());
}
