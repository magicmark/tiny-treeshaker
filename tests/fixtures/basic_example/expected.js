import { Boz, Foo as MyFoo } from 'some/module2';

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