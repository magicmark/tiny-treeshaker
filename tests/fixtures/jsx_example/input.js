import { Box, Button, Text } from '@chakra-ui/react';
import { Link, Route, useParams } from 'react-router-dom';

import { ArrowBackIcon } from '@chakra-ui/icons';
import MoneyTable from './MoneyTable';
import Shell from '../Shell';

const foo = () => {};
const bar = () => foo();

const Header = ({ text }) => {
    return <h1>{text}</h1>;
};

const FilterView = () => {
    const { filter } = useParams();

    return (
        <Shell namespace="FILTERS">
            <Box mb={4}>
                <Link to="/filters">
                    <Button leftIcon={<ArrowBackIcon />}>Back</Button>
                </Link>
            </Box>

            <Header text="My Money Filters" />
            <MoneyTable slug={filter} />
        </Shell>
    );
};

export default FilterView;
